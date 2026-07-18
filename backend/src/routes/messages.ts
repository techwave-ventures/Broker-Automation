import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postSendMessage } from '../controllers/messagesController.js';

export const messagesRouter = Router();

messagesRouter.post('/', requireAuth, postSendMessage);
