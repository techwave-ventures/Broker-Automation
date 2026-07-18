import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postDeregister } from '../controllers/deregisterController.js';

export const deregisterRouter = Router();

deregisterRouter.post('/', requireAuth, postDeregister);
