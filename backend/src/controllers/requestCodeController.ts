import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getTokenForWaba, requestCode } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { requestCodeSchema, type RequestCodeInput } from '../modules/schemas.js';

export async function postRequestCode(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<RequestCodeInput>(requestCodeSchema, req.body);
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWaba(body.waba_id, userId);
    await requestCode(body.phone_number_id, accessToken);
    return res.json({ status: 'ok' });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to request verification code:', error);
    return jsonError(res, 500, 'Failed to request verification code');
  }
}
