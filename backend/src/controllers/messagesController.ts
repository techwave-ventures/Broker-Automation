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
      console.warn(`⚠️ [MANUAL MESSAGE WARNING] Rejecting request: Missing user email in session.`);
      return jsonError(res, 401, 'Missing user email in session');
    }

    console.log(`\n================================================================`);
    console.log(`💬 [MANUAL MESSAGE START] Request received to send message manually`);
    console.log(`From Agent User: ${userId}`);
    console.log(`WABA ID: ${body.waba_id} | Phone ID: ${body.phone_number_id}`);
    console.log(`Recipient Phone: ${body.dest_phone}`);
    console.log(`Message Content: "${body.message_content}"`);
    console.log(`================================================================\n`);

    const accessToken = await getTokenForWaba(body.waba_id, userId);
    console.log(`🔑 [MANUAL MESSAGE] Retrieved WABA Access Token successfully`);

    const jobId = await enqueueJob('whatsapp_send', {
      phoneNumberId: body.phone_number_id,
      accessToken,
      destPhone: body.dest_phone,
      messageContent: body.message_content,
      wabaId: body.waba_id,
      senderType: 'agent',
    });

    console.log(`📦 [MANUAL MESSAGE SUCCESS] Enqueued 'whatsapp_send' job with ID: ${jobId}`);
    return res.json({ status: 'ok', data: { queued: true, jobId } });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      console.warn(`⚠️ [MANUAL MESSAGE WARNING] Validation failed: ${validationError}`);
      return jsonError(res, 400, validationError);
    }
    console.error('❌ [MANUAL MESSAGE ERROR] Failed to send message:', error);
    return jsonError(res, 500, 'Failed to send message');
  }
}
