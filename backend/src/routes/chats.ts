import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getChats,
  getChat,
  updateChat,
  getMessages,
  postChatMessage
} from '../controllers/chatsController.js';

export const chatsRouter = Router();

chatsRouter.get('/', requireAuth, getChats);
chatsRouter.get('/:id', requireAuth, getChat);
chatsRouter.put('/:id', requireAuth, updateChat);
chatsRouter.get('/:id/messages', requireAuth, getMessages);
chatsRouter.post('/:id/messages', requireAuth, postChatMessage);
