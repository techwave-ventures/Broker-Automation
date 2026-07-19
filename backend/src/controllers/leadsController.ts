import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as LeadModel from '../models/Lead.js';
import { jsonError } from './http.js';
import { z } from 'zod';

const leadSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  requestedLocality: z.string().optional(),
  budget: z.string().optional(),
  otherReqs: z.string().optional(),
  interestedPropertyId: z.string().optional(),
  appointmentDate: z.string().nullable().optional(),
  status: z.enum(['Upcoming Visit', 'Visited', 'Negotiating', 'Browsing (No Visit)', 'Closed']).default('Browsing (No Visit)'),
  leadScore: z.enum(['High', 'Medium', 'Low']).default('Low')
});

export async function getLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }
    const leads = await LeadModel.getLeadsByUser(userId);
    return res.json(leads);
  } catch (error) {
    console.error('Failed to get leads:', error);
    return jsonError(res, 500, 'Failed to get leads');
  }
}

export async function getLead(req: AuthenticatedRequest, res: Response) {
  try {
    const key = String(req.params.id);
    const lead = await LeadModel.getLeadByKey(key);
    if (!lead) {
      return jsonError(res, 404, 'Lead not found');
    }
    return res.json(lead);
  } catch (error) {
    console.error('Failed to get lead:', error);
    return jsonError(res, 500, 'Failed to get lead');
  }
}

export async function createLead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const newLead = await LeadModel.createLead(parsed.data, userId);
    return res.status(201).json(newLead);
  } catch (error) {
    console.error('Failed to create lead:', error);
    return jsonError(res, 500, 'Failed to create lead');
  }
}

export async function updateLead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const parsed = leadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const updated = await LeadModel.updateLead(key, parsed.data, userId);
    if (!updated) {
      return jsonError(res, 404, 'Lead not found or unauthorized');
    }

    return res.json(updated);
  } catch (error) {
    console.error('Failed to update lead:', error);
    return jsonError(res, 500, 'Failed to update lead');
  }
}

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const deleted = await LeadModel.deleteLead(key, userId);
    if (!deleted) {
      return jsonError(res, 404, 'Lead not found or unauthorized');
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    return jsonError(res, 500, 'Failed to delete lead');
  }
}
