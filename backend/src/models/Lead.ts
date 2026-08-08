import { pool } from '../lib/db.js';
import { SiteVisit, getSiteVisitsByLead } from './SiteVisit.js';

export interface Lead {
  key?: string; // stored as bigint in DB, serialized as string in API
  user_id: string;
  customerName: string;
  customerPhone: string;
  category?: 'Residential' | 'Commercial' | 'Land' | null;
  requestedLocality?: string;
  budget?: string;
  otherReqs?: string;
  status: 'Upcoming Visit' | 'Visited' | 'Negotiating' | 'Browsing (No Visit)' | 'Closed' | 'Lost (Not Interested)';
  leadScore: 'High' | 'Medium' | 'Low';
  created_at?: string;
  updated_at?: string;
  visits?: SiteVisit[];
}

export interface LeadFilters {
  search?: string;
  status?: string;
  leadScore?: string;
}

export async function getLeadsByUser(userId: string, filters?: LeadFilters): Promise<Lead[]> {
  const conditions: string[] = ['l.user_id = $1'];
  const values: unknown[] = [userId];
  let paramIdx = 2;

  if (filters?.status && filters.status !== 'All') {
    conditions.push(`l.status = $${paramIdx++}`);
    values.push(filters.status);
  }

  if (filters?.leadScore && filters.leadScore !== 'All') {
    conditions.push(`l.lead_score = $${paramIdx++}`);
    values.push(filters.leadScore);
  }

  if (filters?.search) {
    conditions.push(`(LOWER(l.customer_name) LIKE $${paramIdx} OR l.customer_phone LIKE $${paramIdx++})`);
    values.push(`%${filters.search.toLowerCase()}%`);
  }

  const query = `
    SELECT l.*
    FROM leads l
    WHERE ${conditions.join(' AND ')}
    ORDER BY l.created_at DESC
  `;
  const result = await pool.query(query, values);
  const leads = result.rows.map(row => mapRowToLead(row));

  // Load visits for each lead
  for (const lead of leads) {
    if (lead.key) {
      lead.visits = await getSiteVisitsByLead(lead.key);
    }
  }

  return leads;
}

export async function getLeadByKey(key: string | number): Promise<Lead | null> {
  const query = `
    SELECT l.*
    FROM leads l
    WHERE l.key = $1
  `;
  const result = await pool.query(query, [key]);
  if (result.rows.length === 0) return null;
  const lead = mapRowToLead(result.rows[0]);
  lead.visits = await getSiteVisitsByLead(lead.key!);
  return lead;
}

export async function createLead(
  lead: Omit<Lead, 'key' | 'user_id' | 'created_at' | 'updated_at' | 'visits'>,
  userId: string
): Promise<Lead> {
  const query = `
    INSERT INTO leads (
      user_id, customer_name, customer_phone, category, requested_locality, budget, other_reqs,
      status, lead_score
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING *
  `;
  const values = [
    userId,
    lead.customerName,
    lead.customerPhone,
    lead.category || null,
    lead.requestedLocality || null,
    lead.budget || null,
    lead.otherReqs || null,
    lead.status || 'Browsing (No Visit)',
    lead.leadScore || 'Low'
  ];

  const result = await pool.query(query, values);

  // Reload to get newly created lead and its visits (empty initially)
  const reloaded = await getLeadByKey(result.rows[0].key);
  if (!reloaded) throw new Error('Failed to retrieve newly created lead');
  return reloaded;
}

export async function updateLead(
  key: string | number,
  lead: Partial<Lead>,
  userId: string
): Promise<Lead | null> {
  const current = await getLeadByKey(key);
  if (!current || current.user_id !== userId) return null;

  const query = `
    UPDATE leads SET
      customer_name = COALESCE($1, customer_name),
      customer_phone = COALESCE($2, customer_phone),
      category = COALESCE($3, category),
      requested_locality = COALESCE($4, requested_locality),
      budget = COALESCE($5, budget),
      other_reqs = COALESCE($6, other_reqs),
      status = COALESCE($7, status),
      lead_score = COALESCE($8, lead_score),
      updated_at = CURRENT_TIMESTAMP
    WHERE key = $9 AND user_id = $10
    RETURNING *
  `;

  const values = [
    lead.customerName !== undefined ? lead.customerName : null,
    lead.customerPhone !== undefined ? lead.customerPhone : null,
    lead.category !== undefined ? lead.category : null,
    lead.requestedLocality !== undefined ? lead.requestedLocality : null,
    lead.budget !== undefined ? lead.budget : null,
    lead.otherReqs !== undefined ? lead.otherReqs : null,
    lead.status !== undefined ? lead.status : null,
    lead.leadScore !== undefined ? lead.leadScore : null,
    key,
    userId
  ];

  await pool.query(query, values);

  return getLeadByKey(key);
}

export async function deleteLead(key: string | number, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM leads WHERE key = $1 AND user_id = $2 RETURNING key',
    [key, userId]
  );
  return result.rows.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToLead(row: any): Lead {
  return {
    key: String(row.key),
    user_id: row.user_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    category: row.category || null,
    requestedLocality: row.requested_locality || undefined,
    budget: row.budget || undefined,
    otherReqs: row.other_reqs || undefined,
    status: row.status,
    leadScore: row.lead_score,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
