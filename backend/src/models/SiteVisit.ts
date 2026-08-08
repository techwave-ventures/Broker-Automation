import { pool } from '../lib/db.js';

export interface SiteVisit {
  key?: string;
  lead_id: string;
  property_id?: string | null;
  property_title?: string | null;
  appointment_date: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at?: string;
  updated_at?: string;
}

export async function createSiteVisit(
  visit: Omit<SiteVisit, 'key' | 'created_at' | 'updated_at'>
): Promise<SiteVisit> {
  const query = `
    INSERT INTO site_visits (lead_id, property_id, appointment_date, status)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [
    Number(visit.lead_id),
    visit.property_id ? Number(visit.property_id) : null,
    new Date(visit.appointment_date),
    visit.status || 'Scheduled'
  ];
  const result = await pool.query(query, values);
  return mapRowToSiteVisit(result.rows[0]);
}

export async function getSiteVisitsByLead(leadId: string | number): Promise<SiteVisit[]> {
  const query = `
    SELECT sv.*, p.title as property_title
    FROM site_visits sv
    LEFT JOIN properties p ON sv.property_id = p.key
    WHERE sv.lead_id = $1
    ORDER BY sv.appointment_date DESC
  `;
  const result = await pool.query(query, [Number(leadId)]);
  return result.rows.map(mapRowToSiteVisit);
}

export async function checkSiteVisitExists(
  leadId: string | number,
  propertyId: string | number | null,
  appointmentDate: string
): Promise<boolean> {
  const query = `
    SELECT key FROM site_visits
    WHERE lead_id = $1
      AND (property_id = $2 OR (property_id IS NULL AND $2 IS NULL))
      AND appointment_date = $3
    LIMIT 1
  `;
  const result = await pool.query(query, [
    Number(leadId),
    propertyId ? Number(propertyId) : null,
    new Date(appointmentDate)
  ]);
  return result.rows.length > 0;
}

export async function updateSiteVisitStatus(
  key: string | number,
  status: 'Scheduled' | 'Completed' | 'Cancelled'
): Promise<SiteVisit | null> {
  const query = `
    UPDATE site_visits
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE key = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, Number(key)]);
  if (result.rows.length === 0) return null;
  return mapRowToSiteVisit(result.rows[0]);
}

export async function updateSiteVisitDate(
  key: string | number,
  date: string
): Promise<SiteVisit | null> {
  const query = `
    UPDATE site_visits
    SET appointment_date = $1, updated_at = CURRENT_TIMESTAMP
    WHERE key = $2
    RETURNING *
  `;
  const result = await pool.query(query, [new Date(date), Number(key)]);
  if (result.rows.length === 0) return null;
  return mapRowToSiteVisit(result.rows[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSiteVisit(row: any): SiteVisit {
  return {
    key: String(row.key),
    lead_id: String(row.lead_id),
    property_id: row.property_id ? String(row.property_id) : null,
    property_title: row.property_title || null,
    appointment_date: new Date(row.appointment_date).toISOString(),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
