import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPhoneConfig, postPhoneConfig } from '../controllers/phonesController.js';

export const phonesRouter = Router();

phonesRouter.get('/:id', requireAuth, getPhoneConfig);
phonesRouter.post('/:id', requireAuth, postPhoneConfig);
