import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPaidMessagingTemplates,
  postPaidMessagingSend,
  getAllPaidMessagingTemplates,
  createPaidMessagingTemplate,
  deletePaidMessagingTemplate,
} from '../controllers/paidMessagingController.js';

export const paidMessagingRouter = Router();

paidMessagingRouter.get('/templates', requireAuth, getPaidMessagingTemplates);
paidMessagingRouter.get('/templates/all', requireAuth, getAllPaidMessagingTemplates);
paidMessagingRouter.post('/templates', requireAuth, createPaidMessagingTemplate);
paidMessagingRouter.delete('/templates', requireAuth, deletePaidMessagingTemplate);
paidMessagingRouter.post('/send', requireAuth, postPaidMessagingSend);

