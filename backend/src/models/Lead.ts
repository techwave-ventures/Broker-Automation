import { pool } from '../lib/db.js';

export interface Lead {
  key?: string; // stored as bigint in DB, serialized as string in API
  user_id: string;
  customerName: string;
  customerPhone: string;
  requestedLocality?: string;
  budget?: string;
  otherReqs?: string;
  interestedPropertyId?: string; // key of the property
  interestedPropertyTitle?: string | null; // loaded dynamically via join or null
  appointmentDate?: string | null;
  status: 'Upcoming Visit' | 'Visited' | 'Negotiating' | 'Browsing (No Visit)' | 'Closed';
  leadScore: 'High' | 'Medium' | 'Low';
  created_at?: string;
  updated_at?: string;
}

export async function getLeadsByUser(userId: string): Promise<Lead[]> {
  const query = `
    SELECT l.*, p.title as property_title
    FROM leads l
    LEFT JOIN properties p ON l.interested_property_id = p.key
    WHERE l.user_id = $1
    ORDER BY l.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map(row => mapRowToLead(row));
}

export async function getLeadByKey(key: string | number): Promise<Lead | null> {
  const query = `
    SELECT l.*, p.title as property_title
    FROM leads l
    LEFT JOIN properties p ON l.interested_property_id = p.key
    WHERE l.key = $1
  `;
  const result = await pool.query(query, [key]);
  if (result.rows.length === 0) return null;
  return mapRowToLead(result.rows[0]);
}

export async function createLead(
  lead: Omit<Lead, 'key' | 'user_id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<Lead> {
  const query = `
    INSERT INTO leads (
      user_id, customer_name, customer_phone, requested_locality, budget, other_reqs,
      interested_property_id, appointment_date, status, lead_score
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) RETURNING *
  `;
  const values = [
    userId,
    lead.customerName,
    lead.customerPhone,
    lead.requestedLocality || null,
    lead.budget || null,
    lead.otherReqs || null,
    lead.interestedPropertyId ? Number(lead.interestedPropertyId) : null,
    lead.appointmentDate ? new Date(lead.appointmentDate) : null,
    lead.status || 'Browsing (No Visit)',
    lead.leadScore || 'Low'
  ];

  const result = await pool.query(query, values);
  
  // Reload to get property_title if set
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
      requested_locality = COALESCE($3, requested_locality),
      budget = COALESCE($4, budget),
      other_reqs = COALESCE($5, other_reqs),
      interested_property_id = CASE WHEN $6 = -1 THEN NULL WHEN $6 IS NOT NULL THEN $6 ELSE interested_property_id END,
      appointment_date = CASE WHEN $7 = '1970-01-01T00:00:00.000Z' THEN NULL WHEN $7 IS NOT NULL THEN CAST($7 AS TIMESTAMP) ELSE appointment_date END,
      status = COALESCE($8, status),
      lead_score = COALESCE($9, lead_score),
      updated_at = CURRENT_TIMESTAMP
    WHERE key = $10 AND user_id = $11
    RETURNING *
  `;

  // Note: if user explicitly sets interestedPropertyId to empty, we pass -1 to clear it
  const propertyIdVal = lead.interestedPropertyId === '' ? -1 : (lead.interestedPropertyId ? Number(lead.interestedPropertyId) : null);
  // Clear appointmentDate if empty string is supplied
  const appointmentVal = lead.appointmentDate === '' ? '1970-01-01T00:00:00.000Z' : (lead.appointmentDate || null);

  const values = [
    lead.customerName !== undefined ? lead.customerName : null,
    lead.customerPhone !== undefined ? lead.customerPhone : null,
    lead.requestedLocality !== undefined ? lead.requestedLocality : null,
    lead.budget !== undefined ? lead.budget : null,
    lead.otherReqs !== undefined ? lead.otherReqs : null,
    propertyIdVal,
    appointmentVal,
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
    requestedLocality: row.requested_locality || undefined,
    budget: row.budget || undefined,
    otherReqs: row.other_reqs || undefined,
    interestedPropertyId: row.interested_property_id ? String(row.interested_property_id) : undefined,
    interestedPropertyTitle: row.property_title || null,
    appointmentDate: row.appointment_date ? new Date(row.appointment_date).toISOString() : null,
    status: row.status,
    leadScore: row.lead_score,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
