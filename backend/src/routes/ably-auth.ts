import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAblyAuth } from '../controllers/ablyController.js';

export const ablyAuthRouter = Router();

ablyAuthRouter.get('/', requireAuth, getAblyAuth);
