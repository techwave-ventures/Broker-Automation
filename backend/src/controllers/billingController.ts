import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { pool } from '../lib/db.js';
import { cashfreeFetch } from '../lib/cashfree.js';
import { env } from '../config/env.js';

// Get Billing Status and Transaction History
export async function getBillingStatus(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userRes = await pool.query(
      `SELECT plan_type, credits_balance, auto_recharge_enabled, auto_recharge_amount, 
              subscription_status, current_period_end 
       FROM users WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const txRes = await pool.query(
      `SELECT id, amount, transaction_type, description, created_at 
       FROM credit_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    return res.json({
      status: userRes.rows[0],
      transactions: txRes.rows,
      cashfreeAppId: env.CASHFREE_APP_ID,
      cashfreeEnv: env.CASHFREE_ENV,
    });
  } catch (err: any) {
    console.error('Error fetching billing status:', err);
    return res.status(500).json({ error: 'Failed to fetch billing status', details: err.message });
  }
}

// Update Auto-Recharge Settings
export async function updateAutoRechargeSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.user_id;
  const { auto_recharge_enabled, auto_recharge_amount } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (typeof auto_recharge_enabled !== 'boolean' || typeof auto_recharge_amount !== 'number') {
    return res.status(400).json({ error: 'Invalid settings parameters' });
  }

  try {
    await pool.query(
      `UPDATE users 
       SET auto_recharge_enabled = $1, auto_recharge_amount = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $3`,
      [auto_recharge_enabled, auto_recharge_amount, userId]
    );

    return res.json({ success: true, message: 'Auto-recharge settings updated successfully' });
  } catch (err: any) {
    console.error('Error updating auto-recharge settings:', err);
    return res.status(500).json({ error: 'Failed to update auto-recharge settings', details: err.message });
  }
}

// Create Cashfree Subscription for Standard Plan
export async function createSubscription(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if subscription already active
    const userRes = await pool.query('SELECT email, plan_type, subscription_status FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    if (userRes.rows[0]?.subscription_status === 'active') {
      return res.status(400).json({ error: 'Subscription is already active' });
    }

    const { autoRechargeAmount, autoRechargeThreshold } = req.body as any;
    const refillAmount = typeof autoRechargeAmount === 'number' ? autoRechargeAmount : 5000;
    const refillThreshold = typeof autoRechargeThreshold === 'number' ? autoRechargeThreshold : 200;

    // Retrieve standard plan ID from database
    const planRes = await pool.query(
      "SELECT plan_id FROM subscription_plans WHERE plan_id = 'standard_monthly' OR plan_name = 'Standard Plan' LIMIT 1"
    );
    const planId = planRes.rows[0]?.plan_id || 'standard_monthly';

    const subscriptionId = `sub_${userId.substring(0, 8)}_${Date.now()}`;
    const payload = {
      subscription_id: subscriptionId,
      customer_details: {
        customer_id: userId,
        customer_email: userRes.rows[0].email,
        customer_phone: '9999999999',
      },
      plan_details: {
        plan_id: planId,
      },
      subscription_meta: {
        return_url: `${env.FRONTEND_BASE_URL}/dashboard/subscription?subscription_id=${subscriptionId}`,
      },
    };

    const cashfreeSub = await cashfreeFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Save subscription ID & auto recharge configurations to DB
    await pool.query(
      `UPDATE users 
       SET cashfree_subscription_id = $1, 
           plan_type = 'standard', 
           auto_recharge_enabled = true, 
           auto_recharge_amount = $2, 
           auto_recharge_threshold = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $4`,
      [subscriptionId, refillAmount, refillThreshold, userId]
    );

    return res.json({
      success: true,
      subscriptionId: subscriptionId,
      paymentSessionId: cashfreeSub.subscription_session_id,
    });
  } catch (err: any) {
    console.error('Error creating Cashfree subscription:', err);
    return res.status(500).json({ error: 'Failed to create subscription', details: err.message });
  }
}

// Create Cashfree Order for Credit Top-up
export async function createTopUpOrder(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.user_id;
  const { credits } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (typeof credits !== 'number' || credits <= 0) {
    return res.status(400).json({ error: 'Invalid credit quantity requested' });
  }

  try {
    const userRes = await pool.query('SELECT email, plan_type FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    const planType = userRes.rows[0]?.plan_type || 'free';

    // Calculate cost based on plan type and tiers
    let rate = 1.00;
    if (planType === 'custom') {
      if (credits < 5000) {
        return res.status(400).json({ error: 'Custom plan top-ups must be at least 5,000 credits' });
      }
      if (credits >= 10000) {
        rate = 0.80;
      } else {
        rate = 0.90;
      }
    } else {
      // Standard or Free plan - flat ₹1.00 per credit
      rate = 1.00;
    }

    const priceRupees = credits * rate;

    const orderId = `topup_${userId.substring(0, 8)}_${Date.now()}`;
    const orderPayload = {
      order_id: orderId,
      order_amount: priceRupees,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_email: userRes.rows[0].email,
        customer_phone: '9999999999',
      },
      order_meta: {
        return_url: `${env.FRONTEND_BASE_URL}/dashboard/subscription?order_id={order_id}`,
      },
      order_tags: {
        userId,
        credits: String(credits),
        price: String(priceRupees),
      },
    };

    const cashfreeOrder = await cashfreeFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });

    return res.json({
      success: true,
      orderId: orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      amount: cashfreeOrder.order_amount,
      currency: cashfreeOrder.order_currency,
      credits,
      rate,
    });
  } catch (err: any) {
    console.error('Error creating Cashfree order:', err);
    return res.status(500).json({ error: 'Failed to create top-up order', details: err.message });
  }
}
