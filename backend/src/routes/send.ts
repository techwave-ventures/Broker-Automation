import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postSendMessage } from '../controllers/messagesController.js';

export const sendRouter = Router();

sendRouter.post('/', requireAuth, postSendMessage);
