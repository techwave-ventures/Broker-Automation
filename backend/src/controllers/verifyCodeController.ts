import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getTokenForWaba, verifyCode } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { verifyCodeSchema, type VerifyCodeInput } from '../modules/schemas.js';

export async function postVerifyCode(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<VerifyCodeInput>(verifyCodeSchema, req.body);
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWaba(body.wabaId, userId);
    await verifyCode(body.phoneId, accessToken, body.otpCode);
    return res.json({ status: 'ok' });
  } catch (error: unknown) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('verify_code error:', error);
    const { code, message, status } = mapGraphApiError(error);
    return res.status(status).json({ error: true, code, message });
  }
}

function mapGraphApiError(err: unknown): { code: string; message: string; status: number } {
  const error = err as Record<string, unknown>;
  const apiCode = error?.code;
  const apiSubcode = error?.error_subcode;
  const message = typeof error?.message === 'string' ? error.message : '';

  if (apiSubcode === 136025 || /expired|invalid.*otp/i.test(message)) {
    return { code: 'OTP_EXPIRED', message: 'Verification code has expired. Please request a new one.', status: 400 };
  }
  if (apiCode === 100) {
    return { code: 'INVALID_CODE', message: 'Invalid verification code.', status: 400 };
  }
  if (apiCode === 4 || apiSubcode === 2388093) {
    return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.', status: 429 };
  }
  return { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred. Please try again.', status: 500 };
}
