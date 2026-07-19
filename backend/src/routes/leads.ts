import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead
} from '../controllers/leadsController.js';

export const leadsRouter = Router();

leadsRouter.get('/', requireAuth, getLeads);
leadsRouter.get('/:id', requireAuth, getLead);
leadsRouter.post('/', requireAuth, createLead);
leadsRouter.put('/:id', requireAuth, updateLead);
leadsRouter.delete('/:id', requireAuth, deleteLead);
