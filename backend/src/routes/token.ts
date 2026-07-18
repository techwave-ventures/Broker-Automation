import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postTokenExchange } from '../controllers/tokenController.js';

export const tokenRouter = Router();

tokenRouter.post('/', requireAuth, postTokenExchange);
