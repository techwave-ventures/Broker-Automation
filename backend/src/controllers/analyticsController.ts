import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { pool } from '../lib/db.js';
import { jsonError } from './http.js';

export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
        const email = req.auth?.email;
        // conversations.user_id may be stored as sub/user_id OR email depending on how the user was set up
        const subId = req.auth?.user_id || req.auth?.sub || email;
        const userId = email; // leads and properties always use email as user_id

        if (!userId) {
            return jsonError(res, 401, 'Unauthorized');
        }

        const now = new Date();
        // Current 30-day window
        const thisPeriodStart = new Date(now);
        thisPeriodStart.setDate(thisPeriodStart.getDate() - 30);
        // Previous 30-day window
        const prevPeriodStart = new Date(now);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - 60);
        const prevPeriodEnd = thisPeriodStart;

        // ─── KPI queries (this period + previous period) ─────────────────────────

        // Total Leads (leads always stored by email)
        const [totalLeadsThis, totalLeadsPrev] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS count FROM leads WHERE user_id = $1 AND created_at >= $2`,
                [userId, thisPeriodStart]
            ),
            pool.query(
                `SELECT COUNT(*) AS count FROM leads WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
                [userId, prevPeriodStart, prevPeriodEnd]
            ),
        ]);

        // Qualified Leads (High/Medium score or meaningful status)
        const [qualLeadsThis, qualLeadsPrev] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS count FROM leads
         WHERE user_id = $1 AND created_at >= $2
         AND (lead_score IN ('High', 'Medium') OR status IN ('Upcoming Visit', 'Visited', 'Negotiating', 'Closed'))`,
                [userId, thisPeriodStart]
            ),
            pool.query(
                `SELECT COUNT(*) AS count FROM leads
         WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
         AND (lead_score IN ('High', 'Medium') OR status IN ('Upcoming Visit', 'Visited', 'Negotiating', 'Closed'))`,
                [userId, prevPeriodStart, prevPeriodEnd]
            ),
        ]);

        // Total Conversations — match on BOTH sub/user_id AND email (conversations.user_id can be stored either way)
        const [totalConvsThis, totalConvsPrev] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS count FROM conversations
         WHERE (user_id = $1 OR user_id = $2) AND last_message_at >= $3`,
                [subId, email, thisPeriodStart]
            ),
            pool.query(
                `SELECT COUNT(*) AS count FROM conversations
         WHERE (user_id = $1 OR user_id = $2) AND last_message_at >= $3 AND last_message_at < $4`,
                [subId, email, prevPeriodStart, prevPeriodEnd]
            ),
        ]);

        // Viewings Scheduled (appointment booked or visited)
        const [viewingsThis, viewingsPrev] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS count FROM leads
         WHERE user_id = $1 AND created_at >= $2
         AND (appointment_date IS NOT NULL OR status IN ('Upcoming Visit', 'Visited'))`,
                [userId, thisPeriodStart]
            ),
            pool.query(
                `SELECT COUNT(*) AS count FROM leads
         WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
         AND (appointment_date IS NOT NULL OR status IN ('Upcoming Visit', 'Visited'))`,
                [userId, prevPeriodStart, prevPeriodEnd]
            ),
        ]);

        // ─── Weekly activity (leads + conversations per day, last 7 days) ────────
        const weeklyLeadsRes = await pool.query(
            `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM leads
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
            [userId]
        );

        const weeklyConvsRes = await pool.query(
            `SELECT DATE(last_message_at) AS day, COUNT(*) AS count
       FROM conversations
       WHERE (user_id = $1 OR user_id = $2) AND last_message_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(last_message_at)
       ORDER BY day ASC`,
            [subId, email]
        );

        // Helper: format a Date as YYYY-MM-DD in local timezone
        function localDateStr(d: Date): string {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        // Helper: pg DATE columns may come back as a JS Date object (midnight UTC)
        // or as a string "YYYY-MM-DD". String(Date).slice(0,10) gives garbage like
        // "Mon Jul 27" which never matches — so we need to handle both cases.
        function pgDateToLocalStr(val: unknown): string {
            if (val instanceof Date) {
                // Midnight UTC → shift to local timezone
                return localDateStr(new Date(val.getTime()));
            }
            const s = String(val);
            // Already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            // Fallback: parse and format
            return localDateStr(new Date(s + 'T00:00:00'));
        }

        // Build a day-keyed map for last 7 days (in local timezone)
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyMap: Record<string, { leads: number; conversations: number; day: string }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = localDateStr(d);
            weeklyMap[key] = { leads: 0, conversations: 0, day: dayLabels[d.getDay()] };
        }

        for (const row of weeklyLeadsRes.rows) {
            const key = pgDateToLocalStr(row.day);
            if (weeklyMap[key]) weeklyMap[key].leads = Number(row.count);
        }
        for (const row of weeklyConvsRes.rows) {
            const key = pgDateToLocalStr(row.day);
            if (weeklyMap[key]) weeklyMap[key].conversations = Number(row.count);
        }
        const weeklyData = Object.values(weeklyMap);

        // ─── Top Performing Listings (properties with most leads in last 30 days) ─
        const topPropertiesRes = await pool.query(
            `SELECT p.key, p.title, p.locality, p.city,
        COUNT(DISTINCT l.key) AS lead_count,
        COUNT(DISTINCT c.id) AS conv_count
       FROM properties p
       LEFT JOIN leads l ON l.interested_property_id = p.key AND l.created_at >= $2
       LEFT JOIN conversations c ON (c.user_id = p.user_id OR c.user_id = $3) AND c.last_message_at >= $2
       WHERE p.user_id = $1
       GROUP BY p.key, p.title, p.locality, p.city
       ORDER BY lead_count DESC, conv_count DESC
       LIMIT 5`,
            [userId, thisPeriodStart, subId]
        );

        // Helper to compute percentage change
        function calcChange(current: number, previous: number): { change: string; up: boolean } {
            if (previous === 0) return { change: current > 0 ? '+100%' : '0%', up: current >= 0 };
            const pct = Math.round(((current - previous) / previous) * 100);
            return { change: (pct >= 0 ? '+' : '') + pct + '%', up: pct >= 0 };
        }

        const totalLeadsNow = Number(totalLeadsThis.rows[0]?.count ?? 0);
        const totalLeadsBefore = Number(totalLeadsPrev.rows[0]?.count ?? 0);
        const qualLeadsNow = Number(qualLeadsThis.rows[0]?.count ?? 0);
        const qualLeadsBefore = Number(qualLeadsPrev.rows[0]?.count ?? 0);
        const totalConvsNow = Number(totalConvsThis.rows[0]?.count ?? 0);
        const totalConvsBefore = Number(totalConvsPrev.rows[0]?.count ?? 0);
        const viewingsNow = Number(viewingsThis.rows[0]?.count ?? 0);
        const viewingsBefore = Number(viewingsPrev.rows[0]?.count ?? 0);

        const topProperties = topPropertiesRes.rows.map((p) => {
            const leads = Number(p.lead_count);
            const conv = Number(p.conv_count);
            const rate = conv > 0 ? ((leads / conv) * 100).toFixed(1) + '%' : '0%';
            return {
                name: `${p.title}, ${p.locality}`,
                leads,
                conv,
                rate,
            };
        });

        return res.json({
            kpis: {
                totalLeads: { value: totalLeadsNow, ...calcChange(totalLeadsNow, totalLeadsBefore) },
                qualifiedLeads: { value: qualLeadsNow, ...calcChange(qualLeadsNow, qualLeadsBefore) },
                totalConversations: { value: totalConvsNow, ...calcChange(totalConvsNow, totalConvsBefore) },
                viewingsScheduled: { value: viewingsNow, ...calcChange(viewingsNow, viewingsBefore) },
            },
            weeklyData,
            topProperties,
        });
    } catch (error) {
        console.error('Failed to get analytics:', error);
        return jsonError(res, 500, 'Failed to load analytics');
    }
}
