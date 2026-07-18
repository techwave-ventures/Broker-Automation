import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { getTokenForWabaByUser, getMessageTemplates, getTemplateGatingData, checkWabaPaymentMethod } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { paidMessagingSendSchema, paidMessagingTemplatesQuerySchema, type PaidMessagingSendInput, type PaidMessagingTemplatesQueryInput } from '../modules/schemas.js';
import { enqueueJob } from '../lib/queue.js';

const E164_REGEX = /^\+\d{7,15}$/;

export async function getPaidMessagingTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const body = paidMessagingTemplatesQuerySchema.parse(req.query) as PaidMessagingTemplatesQueryInput;
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWabaByUser(body.waba_id, userId, env.FB_APP_ID);
    if (!accessToken) {
      return jsonError(res, 403, 'You do not have access to this WABA');
    }

    const [templates, gating] = await Promise.all([getMessageTemplates(body.waba_id, accessToken), getTemplateGatingData(body.waba_id, accessToken)]);
    return res.json({ templates, gating });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch templates';
    return jsonError(res, 500, message);
  }
}

export async function postPaidMessagingSend(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<PaidMessagingSendInput>(paidMessagingSendSchema, req.body);
    if (!E164_REGEX.test(body.recipient)) {
      return jsonError(res, 400, 'Phone number must be in E.164 format (e.g., +1234567890)');
    }

    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    const accessToken = await getTokenForWabaByUser(body.waba_id, userId, env.FB_APP_ID);
    if (!accessToken) {
      return jsonError(res, 403, 'You do not have access to this WABA');
    }

    const hasPaymentMethod = await checkWabaPaymentMethod(body.waba_id, accessToken);
    if (!hasPaymentMethod) {
      return jsonError(
        res,
        403,
        'This WABA does not have a payment method. Add a payment method in WhatsApp Business Manager to send template messages.',
      );
    }

    const jobId = await enqueueJob('whatsapp_template_send', {
      phoneNumberId: body.phone_number_id,
      accessToken,
      to: body.recipient,
      templateName: body.template_name,
      templateLanguage: body.template_language,
      componentParams: body.component_params || [],
      bizOpaqueCallbackData: typeof body.biz_opaque_callback_data === 'string' && body.biz_opaque_callback_data.length > 0
        ? body.biz_opaque_callback_data
        : undefined,
      wabaId: body.waba_id,
    });

    return res.json({
      messages: [
        {
          id: `job-${jobId}`
        }
      ]
    });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    const err = error instanceof Error ? error : new Error('Failed to send template message');
    const status = (error as { status?: number }).status || 500;
    const graphApiError = (error as { graphApiError?: unknown }).graphApiError;
    return res.status(status).json({
      error: err.message,
      graphApiError: graphApiError || undefined,
    });
  }
}
