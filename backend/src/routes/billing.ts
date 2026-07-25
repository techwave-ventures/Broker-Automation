import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getBillingStatus,
  updateAutoRechargeSettings,
  createSubscription,
  createTopUpOrder,
} from '../controllers/billingController.js';

export const billingRouter = Router();

// Retrieve billing info and transactions
billingRouter.get('/status', requireAuth, getBillingStatus);

// Edit auto-recharge preferences
billingRouter.post('/auto-recharge/settings', requireAuth, updateAutoRechargeSettings);

// Initiate standard monthly subscription
billingRouter.post('/subscribe', requireAuth, createSubscription);

// Purchase one-off pre-paid credits
billingRouter.post('/topup', requireAuth, createTopUpOrder);
