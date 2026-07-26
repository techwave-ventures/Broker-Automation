import type { Request, Response } from 'express';
import { verifyCashfreeSignature } from '../lib/cashfree.js';
import { pool } from '../lib/db.js';

export async function postCashfreeWebhook(req: Request, res: Response) {
  const signature = req.header('x-webhook-signature');
  const timestamp = req.header('x-webhook-timestamp');

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body ?? {});

  const isVerified = verifyCashfreeSignature(rawBody, signature, timestamp);
  if (!isVerified) {
    console.warn('⚠️ [CASHFREE WEBHOOK] Invalid signature verification failed', {
      signature,
      timestamp,
      rawBodyLength: rawBody.length,
      rawBodyPreview: rawBody.substring(0, 100)
    });
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Handle both standard PG events and Subscription events
  const eventType = payload.type || payload.cf_event;
  console.log(`\ud83d\udd14 [CASHFREE WEBHOOK] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK': {
        const order = payload.data?.order;
        if (!order) {
          console.warn('\u26a0\ufe0f [CASHFREE WEBHOOK] No order data in success webhook');
          break;
        }

        const orderId = order.order_id;
        const orderTags = order.order_tags || {};
        const userId = orderTags.userId;
        const credits = orderTags.credits ? parseInt(orderTags.credits, 10) : 0;

        if (!userId || credits <= 0) {
          console.warn(`\u26a0\ufe0f [CASHFREE WEBHOOK] Order ${orderId} does not contain valid userId or credits in tags.`);
          break;
        }

        // Check if order was already processed to prevent double-crediting
        const dupCheck = await pool.query(
          `SELECT id FROM credit_transactions 
           WHERE user_id = $1 AND description LIKE $2 LIMIT 1`,
          [userId, `%Order ID: ${orderId}%`]
        );

        if (dupCheck.rows.length > 0) {
          console.log(`\u26a0\ufe0f [CASHFREE WEBHOOK] Order ${orderId} already processed. Skipping duplicate credit.`);
          break;
        }

        // Apply credit
        await pool.query(
          `UPDATE users 
           SET credits_balance = credits_balance + $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2`,
          [credits, userId]
        );

        // Record transaction
        await pool.query(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
           VALUES ($1, $2, 'top_up', $3)`,
          [userId, credits, `Prepaid top-up. Order ID: ${orderId}`]
        );

        console.log(`\u2705 [CASHFREE WEBHOOK] Order ${orderId} paid. Credited ${credits} credits to User ${userId}.`);
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_SUCCESS': {
        const subId = payload.cf_subscriptionId;
        if (!subId) {
          console.warn('\u26a0\ufe0f [CASHFREE WEBHOOK] No subscription ID in payment success event');
          break;
        }

        // Find user by subscription ID
        const userRes = await pool.query(
          'SELECT user_id, plan_type, credits_balance, auto_recharge_amount FROM users WHERE cashfree_subscription_id = $1 LIMIT 1',
          [subId]
        );

        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          const userId = user.user_id;
          const planType = user.plan_type || 'standard';

          // Determine monthly credits quota
          const newQuota = planType === 'custom' ? (user.auto_recharge_amount || 5000) : 3000;
          const oldBalance = user.credits_balance || 0;

          // Expire remaining old credits (credits do not roll over)
          if (oldBalance > 0) {
            await pool.query(
              `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
               VALUES ($1, $2, 'monthly_expire', $3)`,
              [userId, -oldBalance, `Expired ${oldBalance} unused credits from previous cycle`]
            );
          }

          // Grant fresh credits
          await pool.query(
            `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
             VALUES ($1, $2, 'subscription_grant', $3)`,
            [userId, newQuota, `Monthly subscription credit grant for ${planType} plan`]
          );

          // Update user balance & status
          const currentEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
          await pool.query(
            `UPDATE users 
             SET credits_balance = $1, subscription_status = 'active', current_period_end = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $3`,
            [newQuota, currentEnd, userId]
          );

          console.log(`\u2705 [CASHFREE WEBHOOK] Subscription ${subId} charged. User: ${userId} credited with ${newQuota} credits.`);
        } else {
          console.warn(`\u26a0\ufe0f [CASHFREE WEBHOOK] Subscription ID ${subId} not found in database.`);
        }
        break;
      }

      case 'SUBSCRIPTION_STATUS_CHANGE': {
        const subId = payload.cf_subscriptionId;
        const status = payload.cf_status;
        if (!subId) {
          break;
        }

        const isInactive = ['CANCELLED', 'EXPIRED', 'SUSPENDED', 'NON_RENEWING'].includes(status);
        if (isInactive) {
          await pool.query(
            `UPDATE users 
             SET subscription_status = 'inactive', updated_at = CURRENT_TIMESTAMP 
             WHERE cashfree_subscription_id = $1`,
            [subId]
          );
          console.log(`\u274c [CASHFREE WEBHOOK] Subscription ${subId} updated to inactive due to status: ${status}.`);
        }
        break;
      }

      default: {
        console.log(`\u2139\ufe0f [CASHFREE WEBHOOK] Unhandled event type: ${eventType}`);
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('\u274c [CASHFREE WEBHOOK ERROR]:', err);
    return res.status(500).json({ error: 'Webhook handler failed', details: err.message });
  }
}
