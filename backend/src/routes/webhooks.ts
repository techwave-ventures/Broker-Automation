import { Router } from 'express';
import { getWebhookChallenge, postWebhook } from '../controllers/webhooksController.js';
import { postCashfreeWebhook } from '../controllers/cashfreeWebhookController.js';

export const webhooksRouter = Router();

webhooksRouter.get('/', getWebhookChallenge);
webhooksRouter.post('/', postWebhook);
webhooksRouter.post('/cashfree', postCashfreeWebhook);

