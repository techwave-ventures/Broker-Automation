import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getTokenForWaba } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { sendSchema, type SendInput } from '../modules/schemas.js';
import { enqueueJob } from '../lib/queue.js';

export async function postSendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<SendInput>(sendSchema, req.body);
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWaba(body.waba_id, userId);

    const jobId = await enqueueJob('whatsapp_send', {
      phoneNumberId: body.phone_number_id,
      accessToken,
      destPhone: body.dest_phone,
      messageContent: body.message_content,
      wabaId: body.waba_id,
    });

    return res.json({ status: 'ok', data: { queued: true, jobId } });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to send message:', error);
    return jsonError(res, 500, 'Failed to send message');
  }
}
