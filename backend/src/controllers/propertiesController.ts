import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as PropertyModel from '../models/Property.js';
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
    return res.json(property);
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
