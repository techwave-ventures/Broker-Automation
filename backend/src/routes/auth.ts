import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, getMe);
