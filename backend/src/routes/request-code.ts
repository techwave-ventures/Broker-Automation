import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postRequestCode } from '../controllers/requestCodeController.js';

export const requestCodeRouter = Router();

requestCodeRouter.post('/', requireAuth, postRequestCode);
