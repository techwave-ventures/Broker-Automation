import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  graphApiCallAction,
  graphApiCallPermissionsGet,
  graphApiGetCallSettings,
  graphApiUpdateCallSettings,
  graphApiSendCallPermissionRequest,
} from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import {
  callAcceptSchema,
  callRejectSchema,
  callConnectSchema,
  callTerminateSchema,
  callPreAcceptSchema,
  callPermissionsQuerySchema,
  callSettingsQuerySchema,
  callSettingsUpdateSchema,
  callPermissionRequestSchema,
  type CallAcceptInput,
  type CallRejectInput,
  type CallConnectInput,
  type CallTerminateInput,
  type CallPreAcceptInput,
  type CallPermissionsQueryInput,
  type CallSettingsQueryInput,
  type CallSettingsUpdateInput,
  type CallPermissionRequestInput,
} from '../modules/schemas.js';

export async function postAcceptCall(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallAcceptInput>(callAcceptSchema, req.body);
    const result = await graphApiCallAction(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, {
      messaging_product: 'whatsapp',
      call_id: body.callId,
      action: 'accept',
      session: { sdp: body.sdp, sdp_type: body.sdpType },
    });

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json({ status: 'ok', data: result });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to accept call:', error);
    return jsonError(res, 500, 'Failed to accept call');
  }
}

export async function postRejectCall(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallRejectInput>(callRejectSchema, req.body);
    const result = await graphApiCallAction(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, {
      messaging_product: 'whatsapp',
      call_id: body.callId,
      action: 'reject',
    });
    return res.json({ status: 'ok', data: result });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to reject call:', error);
    return jsonError(res, 500, 'Failed to reject call');
  }
}

export async function postConnectCall(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallConnectInput>(callConnectSchema, req.body);
    const result = await graphApiCallAction(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, {
      messaging_product: 'whatsapp',
      to: body.to,
      action: 'connect',
      session: { sdp: body.sdp, sdp_type: body.sdpType },
    });

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    const callId = (result as { calls?: Array<{ id?: string }> })?.calls?.[0]?.id;
    return res.json({ status: 'ok', callId });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to connect call:', error);
    return jsonError(res, 500, 'Failed to connect call');
  }
}

export async function postTerminateCall(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallTerminateInput>(callTerminateSchema, req.body);
    const result = await graphApiCallAction(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, {
      messaging_product: 'whatsapp',
      call_id: body.callId,
      action: 'terminate',
    });
    return res.json({ status: 'ok', data: result });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to terminate call:', error);
    return jsonError(res, 500, 'Failed to terminate call');
  }
}

export async function postPreAcceptCall(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallPreAcceptInput>(callPreAcceptSchema, req.body);
    const result = await graphApiCallAction(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, {
      messaging_product: 'whatsapp',
      call_id: body.callId,
      action: 'pre_accept',
      session: { sdp: body.sdp, sdp_type: body.sdpType },
    });

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json({ status: 'ok', data: result });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to pre-accept call:', error);
    return jsonError(res, 500, 'Failed to pre-accept call');
  }
}

export async function getCallPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const body = callPermissionsQuerySchema.parse(req.query) as CallPermissionsQueryInput;
    const result = await graphApiCallPermissionsGet(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, body.userWaId);

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json(result);
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to check call permissions:', error);
    return jsonError(res, 500, 'Failed to check call permissions');
  }
}

export async function getCallSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const body = callSettingsQuerySchema.parse(req.query) as CallSettingsQueryInput;
    const result = await graphApiGetCallSettings(req.auth?.email ?? '', body.wabaId, body.phoneNumberId);

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json(result);
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to get call settings:', error);
    return jsonError(res, 500, 'Failed to get call settings');
  }
}

export async function postCallSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallSettingsUpdateInput>(callSettingsUpdateSchema, req.body);
    const result = await graphApiUpdateCallSettings(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, body.enabled);

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json({ status: 'ok', success: (result as { success?: boolean })?.success });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to update call settings:', error);
    return jsonError(res, 500, 'Failed to update call settings');
  }
}

export async function postCallPermissionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CallPermissionRequestInput>(callPermissionRequestSchema, req.body);
    const text = body.bodyText || "Hi, we'd like to call you regarding your recent inquiry. Please grant permission so we can connect.";
    const result = await graphApiSendCallPermissionRequest(req.auth?.email ?? '', body.wabaId, body.phoneNumberId, body.to, text);

    if ((result as { error?: { message?: string } })?.error) {
      const error = result as { error?: { message?: string } };
      return jsonError(res, 400, error.error?.message || 'Graph API error');
    }

    return res.json({ status: 'ok', messageId: (result as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to send call permission request:', error);
    return jsonError(res, 500, 'Failed to send call permission request');
  }
}
