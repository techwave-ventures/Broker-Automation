import { env } from '../config/env.js';
import { cashfreeFetch } from './cashfree.js';
import { pool } from './db.js';

export async function initCashfreePlan() {
  const planId = 'standard_monthly';
  const planName = 'Standard Plan';
  const planType = 'PERIODIC';
  const planAmount = 2999.00;
  const planCurrency = 'INR';

  try {
    // 1. Check if the plan is already stored in the database
    const dbCheck = await pool.query(
      'SELECT plan_id FROM subscription_plans WHERE plan_id = $1 LIMIT 1',
      [planId]
    );

    if (dbCheck.rows.length > 0) {
      console.log(`✅ [CASHFREE] Subscription plan "${planId}" already exists in the database.`);
      return;
    }

    // 2. If not in DB, verify Cashfree credentials are configured before making API requests
    const appId = env.CASHFREE_APP_ID;
    const secretKey = env.CASHFREE_SECRET_KEY;
    if (!appId || !secretKey || appId === 'your-cashfree-app-id' || secretKey === 'your-cashfree-secret-key') {
      console.warn('⚠️ [CASHFREE] Credentials are not configured. Cannot seed plan to Cashfree. Skipping plan database seeding.');
      return;
    }

    console.log(`🔍 [CASHFREE] Plan "${planId}" not found in database. Checking existence on Cashfree API...`);

    let planExistsOnCashfree = false;
    try {
      const cfPlan = await cashfreeFetch(`/plans/${planId}`);
      if (cfPlan && (cfPlan.plan_id === planId || cfPlan.plan_name)) {
        planExistsOnCashfree = true;
        console.log(`✅ [CASHFREE] Subscription plan "${planId}" already exists on Cashfree.`);
      }
    } catch (cfErr: any) {
      const isNotFoundError = 
        cfErr.message?.includes('404') || 
        cfErr.message?.includes('NOT_FOUND') || 
        cfErr.message?.toLowerCase().includes('not found') ||
        cfErr.message?.toLowerCase().includes('does not exist');

      if (!isNotFoundError) {
        console.warn(`⚠️ [CASHFREE] Error querying plan from Cashfree (will attempt creation):`, cfErr.message);
      }
    }

    // 3. If plan does not exist on Cashfree, create it
    if (!planExistsOnCashfree) {
      console.log(`🌱 [CASHFREE] Subscription plan "${planId}" not found on Cashfree. Creating plan on Cashfree...`);
      await cashfreeFetch('/plans', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: planId,
          plan_name: planName,
          plan_type: planType,
          plan_currency: planCurrency,
          plan_recurring_amount: planAmount,
          plan_max_amount: 3500.00,
          plan_intervals: 1,
          plan_interval_type: 'MONTH',
          plan_note: 'Standard Plan for Broker Automation'
        })
      });
      console.log(`🎉 [CASHFREE] Subscription plan "${planId}" created successfully on Cashfree.`);
    }

    // 4. Save the plan to the database
    await pool.query(
      `INSERT INTO subscription_plans (plan_id, plan_name, plan_type, plan_amount, plan_currency) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (plan_id) DO NOTHING`,
      [planId, planName, planType, planAmount, planCurrency]
    );
    console.log(`💾 [CASHFREE] Subscription plan "${planId}" saved to the database.`);

  } catch (err: any) {
    console.error(`❌ [CASHFREE] Failed to initialize/seed subscription plan:`, err.message);
  }
}
