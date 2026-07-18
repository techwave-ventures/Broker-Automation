import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { deregisterNumber, getTokenForWaba } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { deregisterSchema, type DeregisterInput } from '../modules/schemas.js';

export async function postDeregister(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<DeregisterInput>(deregisterSchema, req.body);
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWaba(body.wabaId, userId);
    await deregisterNumber(body.phoneId, accessToken);
    return res.json({ status: 'ok' });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to deregister phone number:', error);
    return jsonError(res, 500, 'Failed to deregister phone number');
  }
}
