import { Router } from 'express';
import { getWebhookChallenge, postWebhook } from '../controllers/webhooksController.js';

export const webhooksRouter = Router();

webhooksRouter.get('/', getWebhookChallenge);
webhooksRouter.post('/', postWebhook);
