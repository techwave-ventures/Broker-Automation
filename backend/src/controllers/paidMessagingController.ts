import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { getTokenForWabaByUser, getMessageTemplates, getTemplateGatingData, checkWabaPaymentMethod, getAllMessageTemplates, createMessageTemplate, deleteMessageTemplate, syncSingleTemplate } from '../services/business.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { paidMessagingSendSchema, paidMessagingTemplatesQuerySchema, createTemplateSchema, deleteTemplateSchema, type PaidMessagingSendInput, type PaidMessagingTemplatesQueryInput, type CreateTemplateInput, type DeleteTemplateInput } from '../modules/schemas.js';
import { enqueueJob } from '../lib/queue.js';

const E164_REGEX = /^\+\d{7,15}$/;

export async function getPaidMessagingTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const body = paidMessagingTemplatesQuerySchema.parse(req.query) as PaidMessagingTemplatesQueryInput;
    const userId = req.auth?.user_id || req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user in session');
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

    const userId = req.auth?.user_id || req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user in session');
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

export async function getAllPaidMessagingTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const body = paidMessagingTemplatesQuerySchema.parse(req.query) as PaidMessagingTemplatesQueryInput;
    const userId = req.auth?.user_id || req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user in session');
    }

    const accessToken = await getTokenForWabaByUser(body.waba_id, userId, env.FB_APP_ID);
    if (!accessToken) {
      return jsonError(res, 403, 'You do not have access to this WABA');
    }

    const templateName = req.query.name as string | undefined;
    const forceSync = req.query.force === 'true';

    if (templateName) {
      await syncSingleTemplate(body.waba_id, accessToken, templateName);
    }

    // Pass false to force sync in getAllMessageTemplates because we either synced single above,
    // or we run full sync if forceSync is true.
    const templates = await getAllMessageTemplates(body.waba_id, accessToken, forceSync && !templateName);
    return res.json({ templates });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch templates';
    return jsonError(res, 500, message);
  }
}

export async function createPaidMessagingTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<CreateTemplateInput>(createTemplateSchema, req.body);
    const userId = req.auth?.user_id || req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user in session');
    }

    const accessToken = await getTokenForWabaByUser(body.waba_id, userId, env.FB_APP_ID);
    if (!accessToken) {
      return jsonError(res, 403, 'You do not have access to this WABA');
    }

    // Normalize variable brackets: Ensure single curly braces like {name} or {1} are converted to double curly braces {{name}} or {{1}}
    let parameterFormat: 'POSITIONAL' | 'NAMED' = 'POSITIONAL';

    const normalizedComponents = (body.components || []).map((comp: any) => {
      if (comp && typeof comp === 'object' && typeof comp.text === 'string') {
        const normalizedText = comp.text.replace(/\{+([a-zA-Z0-9_]+)\}+/g, (match: string, p1: string) => '{{' + p1.toLowerCase() + '}}');
        
        // Find all variables matching {{variable}}
        const varMatches: string[] = [];
        const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
        let match;
        while ((match = regex.exec(normalizedText)) !== null) {
          varMatches.push(match[1]);
        }

        const newComp = {
          ...comp,
          text: normalizedText,
        };

        if (varMatches.length > 0) {
          // If any variable contains non-digits, it is a NAMED parameter format
          const hasNamed = varMatches.some(v => !/^\d+$/.test(v));
          if (hasNamed) {
            parameterFormat = 'NAMED';
          }

          // Build example field if it doesn't exist
          if (!newComp.example) {
            if (newComp.type === 'BODY') {
              if (hasNamed) {
                const bodyTextExamples = varMatches.map(v => {
                  let fallback = 'Sample';
                  if (v.toLowerCase().includes('name')) fallback = 'John';
                  else if (v.toLowerCase().includes('add') || v.toLowerCase().includes('loc')) fallback = '123 Main St';
                  else if (v.toLowerCase().includes('phone') || v.toLowerCase().includes('num')) fallback = '+1234567890';
                  else if (v.toLowerCase().includes('price') || v.toLowerCase().includes('rent') || v.toLowerCase().includes('budget')) fallback = '10,000';
                  return {
                    param_name: v,
                    example: fallback,
                  };
                });
                newComp.example = {
                  body_text_named_params: bodyTextExamples,
                };
              } else {
                newComp.example = {
                  body_text: [varMatches.map(v => `Sample ${v}`)],
                };
              }
            } else if (newComp.type === 'HEADER' && newComp.format === 'TEXT') {
              const fallback = hasNamed && varMatches[0].toLowerCase().includes('name') ? 'John' : 'Sample';
              if (hasNamed) {
                newComp.example = {
                  header_text_named_params: [
                    {
                      param_name: varMatches[0],
                      example: fallback,
                    },
                  ],
                };
              } else {
                newComp.example = {
                  header_text: [fallback],
                };
              }
            }
          }
        }
        return newComp;
      }
      return comp;
    });

    const templatePayload = {
      name: body.name,
      category: body.category,
      language: body.language,
      components: normalizedComponents,
      parameter_format: parameterFormat,
    };

    console.log('📦 Sending template payload to Meta:', JSON.stringify(templatePayload, null, 2));

    const result = await createMessageTemplate(body.waba_id, accessToken, templatePayload as any);

    return res.json(result);
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return jsonError(res, 500, message);
  }
}

export async function deletePaidMessagingTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<DeleteTemplateInput>(deleteTemplateSchema, req.body);
    const userId = req.auth?.user_id || req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Missing user in session');
    }

    const accessToken = await getTokenForWabaByUser(body.waba_id, userId, env.FB_APP_ID);
    if (!accessToken) {
      return jsonError(res, 403, 'You do not have access to this WABA');
    }

    const result = await deleteMessageTemplate(body.waba_id, accessToken, body.name);
    return res.json(result);
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return jsonError(res, 500, message);
  }
}

