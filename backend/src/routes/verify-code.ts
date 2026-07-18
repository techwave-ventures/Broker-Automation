import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postVerifyCode } from '../controllers/verifyCodeController.js';

export const verifyCodeRouter = Router();

verifyCodeRouter.post('/', requireAuth, postVerifyCode);
