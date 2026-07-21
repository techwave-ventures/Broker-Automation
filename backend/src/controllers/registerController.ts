import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getTokenForWaba, registerNumber } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { registerSchema, type RegisterInput } from '../modules/schemas.js';

export async function postRegister(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<RegisterInput>(registerSchema, req.body);
    const userId = req.auth?.user_id || req.auth?.email || req.auth?.sub;
    if (!userId) {
      return jsonError(res, 401, 'Missing user session');
    }

    const accessToken = await getTokenForWaba(body.wabaId, userId);
    await registerNumber(body.phoneId, accessToken);
    return res.json({ status: 'ok' });
  } catch (error: unknown) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('register error:', error);
    const { code, message, status } = mapGraphApiError(error);
    return res.status(status).json({ error: true, code, message });
  }
}

function mapGraphApiError(err: unknown): { code: string; message: string; status: number } {
  const error = err as Record<string, unknown>;
  const apiCode = error?.code;
  const apiSubcode = error?.error_subcode;

  if (apiCode === 100) {
    return { code: 'INVALID_PARAMS', message: 'Invalid parameters provided.', status: 400 };
  }
  if (apiCode === 4 || apiSubcode === 2388093) {
    return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.', status: 429 };
  }
  return { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred. Please try again.', status: 500 };
}
