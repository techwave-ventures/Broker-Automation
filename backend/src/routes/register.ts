import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postRegister } from '../controllers/registerController.js';

export const registerRouter = Router();

registerRouter.post('/', requireAuth, postRegister);
