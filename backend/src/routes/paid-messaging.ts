import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPaidMessagingTemplates, postPaidMessagingSend } from '../controllers/paidMessagingController.js';

export const paidMessagingRouter = Router();

paidMessagingRouter.get('/templates', requireAuth, getPaidMessagingTemplates);
paidMessagingRouter.post('/send', requireAuth, postPaidMessagingSend);
