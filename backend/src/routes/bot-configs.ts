import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getBotConfig, postBotConfig } from '../controllers/botConfigsController.js';

export const botConfigsRouter = Router();

botConfigsRouter.get('/', requireAuth, getBotConfig);
botConfigsRouter.post('/', requireAuth, postBotConfig);
