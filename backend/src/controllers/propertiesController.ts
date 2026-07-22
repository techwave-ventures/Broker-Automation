import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as PropertyModel from '../models/Property.js';
import { findUserByEmail, findUserById } from '../models/userModel.js';
import { pool } from '../lib/db.js';
import { jsonError } from './http.js';
import { z } from 'zod';

const propertySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  transaction_type: z.enum(['Sell', 'Rent']),
  expected_price: z.number().optional(),
  negotiable: z.boolean().optional(),
  monthly_rent: z.number().optional(),
  security_deposit: z.number().optional(),
  available_from: z.string().optional(),
  category: z.enum(['Residential', 'Commercial', 'Land']),
  type: z.string().min(1),
  city: z.string().min(1),
  locality: z.string().min(1),
  full_address: z.string().min(1),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  built_up_area: z.number().optional(),
  plot_area: z.number().optional(),
  furnishing: z.string().optional(),
  parking: z.union([z.string(), z.boolean()]).optional().transform(val => val !== undefined ? String(val) : undefined),
  status: z.enum(['Available', 'Sold', 'Rented', 'Hidden']).default('Available'),
  beds: z.number().optional(),
  baths: z.number().optional(),
  property_age: z.string().optional(),
  ready_to_move: z.boolean().optional(),
  floor_number: z.string().optional(),
  total_floors: z.string().optional(),
  garden: z.boolean().optional(),
  washrooms: z.number().optional(),
  plot_width: z.number().optional(),
  plot_length: z.number().optional(),
  corner_plot: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  other_amenities: z.array(z.string()).optional()
});

export async function getProperties(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }
    const properties = await PropertyModel.getPropertiesByUser(userId);
    return res.json(properties);
  } catch (error) {
    console.error('Failed to get properties:', error);
    return jsonError(res, 500, 'Failed to get properties');
  }
}

export async function getProperty(req: AuthenticatedRequest, res: Response) {
  try {
    const key = String(req.params.id);
    const property = await PropertyModel.getPropertyByKey(key);
    if (!property) {
      return jsonError(res, 404, 'Property not found');
    }

    let dbUserId = property.user_id;
    const user = await findUserByEmail(property.user_id);
    let agentName = property.user_id;
    if (user) {
      dbUserId = user.user_id;
      agentName = user.name || user.email;
    } else {
      const userById = await findUserById(property.user_id);
      if (userById) {
        dbUserId = userById.user_id;
        agentName = userById.name || userById.email;
      }
    }

    let agentPhone = '';
    const phoneRes = await pool.query('SELECT phone_id, display_phone_number FROM phones WHERE user_id = $1 LIMIT 1', [dbUserId]);
    if (phoneRes.rows.length > 0) {
      const phoneId = phoneRes.rows[0].phone_id;
      const dbPhone = phoneRes.rows[0].display_phone_number;
      if (dbPhone) {
        agentPhone = dbPhone;
      } else {
        const wabaRes = await pool.query('SELECT access_token FROM wabas WHERE user_id = $1 LIMIT 1', [dbUserId]);
        if (wabaRes.rows.length > 0) {
          const accessToken = wabaRes.rows[0].access_token;
          try {
            const { env } = await import('../config/env.js');
            const metaRes = await fetch(`https://graph.facebook.com/${env.FB_GRAPH_API_VERSION}/${phoneId}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const metaData = await metaRes.json();
            if (metaData && metaData.display_phone_number) {
              agentPhone = metaData.display_phone_number.replace(/[^0-9]/g, '');
              // Save it to the database so next time it is queried instantly!
              await pool.query('UPDATE phones SET display_phone_number = $1 WHERE phone_id = $2', [agentPhone, phoneId]);
            }
          } catch (err) {
            console.error('Error fetching display phone number from Meta API:', err);
          }
        }
      }
    } else {
      // If there's no entry in phones, try to fetch the WABA details and lookup phone numbers from Meta API.
      const wabaRes = await pool.query('SELECT waba_id, access_token FROM wabas WHERE user_id = $1 LIMIT 1', [dbUserId]);
      if (wabaRes.rows.length > 0) {
        const { waba_id: wabaId, access_token: accessToken } = wabaRes.rows[0];
        try {
          const { env } = await import('../config/env.js');
          const metaRes = await fetch(`https://graph.facebook.com/${env.FB_GRAPH_API_VERSION}/${wabaId}/phone_numbers`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const metaData = await metaRes.json();
          if (metaData && Array.isArray(metaData.data) && metaData.data.length > 0) {
            const phoneObj = metaData.data[0];
            const phoneId = phoneObj.id;
            const displayPhone = phoneObj.display_phone_number ? phoneObj.display_phone_number.replace(/[^0-9]/g, '') : '';
            if (displayPhone) {
              agentPhone = displayPhone;
            }
            // Save it to database so next time it is queried instantly!
            await pool.query(
              `INSERT INTO phones (phone_id, user_id, is_ack_bot_enabled, display_phone_number, last_updated)
               VALUES ($1, $2, TRUE, $3, CURRENT_TIMESTAMP)
               ON CONFLICT (phone_id) DO UPDATE SET user_id = EXCLUDED.user_id, display_phone_number = EXCLUDED.display_phone_number, last_updated = CURRENT_TIMESTAMP`,
              [phoneId, dbUserId, displayPhone || null]
            );
          }
        } catch (err) {
          console.error('Error fetching display phone number from Meta WABA API:', err);
        }
      }
    }

    return res.json({
      ...property,
      agent_name: agentName,
      agent_phone: agentPhone
    });
  } catch (error) {
    console.error('Failed to get property:', error);
    return jsonError(res, 500, 'Failed to get property');
  }
}

export async function createProperty(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const newProperty = await PropertyModel.createProperty(parsed.data, userId);
    return res.status(201).json(newProperty);
  } catch (error) {
    console.error('Failed to create property:', error);
    return jsonError(res, 500, 'Failed to create property');
  }
}

export async function updateProperty(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const updated = await PropertyModel.updateProperty(key, parsed.data, userId);
    if (!updated) {
      return jsonError(res, 404, 'Property not found or unauthorized');
    }

    return res.json(updated);
  } catch (error) {
    console.error('Failed to update property:', error);
    return jsonError(res, 500, 'Failed to update property');
  }
}

export async function deleteProperty(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const deleted = await PropertyModel.deleteProperty(key, userId);
    if (!deleted) {
      return jsonError(res, 404, 'Property not found or unauthorized');
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete property:', error);
    return jsonError(res, 500, 'Failed to delete property');
  }
}
