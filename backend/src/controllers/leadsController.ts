import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as LeadModel from '../models/Lead.js';
import * as SiteVisitModel from '../models/SiteVisit.js';
import { pool } from '../lib/db.js';
import { jsonError } from './http.js';
import { z } from 'zod';

const leadSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  category: z.enum(['Residential', 'Commercial', 'Land']).nullable().optional(),
  requestedLocality: z.string().optional(),
  budget: z.string().optional(),
  otherReqs: z.string().optional(),
  status: z.enum(['Upcoming Visit', 'Visited', 'Negotiating', 'Browsing (No Visit)', 'Closed', 'Lost (Not Interested)']).default('Browsing (No Visit)'),
  leadScore: z.enum(['High', 'Medium', 'Low']).default('Low'),
  interestedPropertyId: z.string().optional().nullable(),
  appointmentDate: z.string().nullable().optional()
});

const visitSchema = z.object({
  propertyId: z.string().optional().nullable(),
  appointmentDate: z.string().min(1),
  status: z.enum(['Scheduled', 'Completed', 'Cancelled']).default('Scheduled')
});

const updateVisitSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Cancelled'])
});

export async function getLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const filters: LeadModel.LeadFilters = {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      leadScore: typeof req.query.leadScore === 'string' ? req.query.leadScore : undefined,
    };

    const leads = await LeadModel.getLeadsByUser(userId, filters);
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

    const { interestedPropertyId, appointmentDate, ...leadData } = parsed.data;
    const newLead = await LeadModel.createLead(leadData, userId);

    if (appointmentDate && newLead.key) {
      await SiteVisitModel.createSiteVisit({
        lead_id: newLead.key,
        property_id: interestedPropertyId || null,
        appointment_date: appointmentDate,
        status: 'Scheduled'
      });
      
      const reloaded = await LeadModel.getLeadByKey(newLead.key);
      return res.status(201).json(reloaded || newLead);
    }

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

    const { interestedPropertyId, appointmentDate, ...leadData } = parsed.data;
    const updated = await LeadModel.updateLead(key, leadData, userId);
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

export async function addSiteVisit(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }
    const leadId = String(req.params.id);
    const parsed = visitSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    // Check ownership
    const lead = await LeadModel.getLeadByKey(leadId);
    if (!lead || lead.user_id !== userId) {
      return jsonError(res, 404, 'Lead not found or unauthorized');
    }

    const newVisit = await SiteVisitModel.createSiteVisit({
      lead_id: leadId,
      property_id: parsed.data.propertyId || null,
      appointment_date: parsed.data.appointmentDate,
      status: parsed.data.status
    });

    // Automatically set lead status to 'Upcoming Visit' when scheduling a visit
    if (lead.status !== 'Upcoming Visit') {
      await LeadModel.updateLead(leadId, { status: 'Upcoming Visit', leadScore: 'High' }, userId);
    }

    return res.status(201).json(newVisit);
  } catch (error) {
    console.error('Failed to add site visit:', error);
    return jsonError(res, 500, 'Failed to add site visit');
  }
}

export async function updateSiteVisit(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }
    const visitId = String(req.params.visitId);
    const parsed = updateVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    // Get the visit first to check lead ownership
    const visitRes = await pool.query('SELECT lead_id FROM site_visits WHERE key = $1', [Number(visitId)]);
    if (visitRes.rows.length === 0) {
      return jsonError(res, 404, 'Site visit not found');
    }
    const leadId = visitRes.rows[0].lead_id;
    const lead = await LeadModel.getLeadByKey(leadId);
    if (!lead || lead.user_id !== userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const updated = await SiteVisitModel.updateSiteVisitStatus(visitId, parsed.data.status);
    return res.json(updated);
  } catch (error) {
    console.error('Failed to update site visit:', error);
    return jsonError(res, 500, 'Failed to update site visit');
  }
}
