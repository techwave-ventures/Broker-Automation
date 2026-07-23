import { pool } from '../lib/db.js';
import { env } from '../config/env.js';
import { metaRateLimiter } from '../lib/rateLimiter.js';
import { cache } from '../lib/cache.js';

type GraphApiPayload = Record<string, unknown>;

function graphApiUrl(path: string) {
  return `https://graph.facebook.com/${env.FB_GRAPH_API_VERSION}${path}`;
}

async function graphApiWrapperGet(path: string, accessToken?: string) {
  return metaRateLimiter.limit(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(graphApiUrl(path), {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    return response.json();
  });
}

async function graphApiWrapperPost(path: string, accessToken: string, body: GraphApiPayload = {}) {
  return metaRateLimiter.limit(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(graphApiUrl(path), {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    return response.json();
  });
}

export async function getToken(code: string, appId: string, redirectUri: string = '') {
  const path = `/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&client_secret=${env.FB_APP_SECRET}&code=${encodeURIComponent(code)}`;
  const data = await graphApiWrapperGet(path);
  if (data.error) {
    throw data.error;
  }
  return data.access_token as string;
}

export async function subscribeWebhook(accessToken: string, wabaId: string) {
  return graphApiWrapperPost(`/${wabaId}/subscribed_apps`, accessToken);
}

async function saveWabaToken(accessToken: string, wabaId: string, appId: string, userId: string, businessId: string) {
  return pool.query(
    `insert into wabas (user_id, app_id, waba_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, waba_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, wabaId, accessToken, businessId],
  );
}

async function savePageToken(accessToken: string, pageId: string, appId: string, userId: string, businessId: string) {
  return pool.query(
    `insert into pages (user_id, app_id, page_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, page_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, pageId, accessToken, businessId],
  );
}

async function saveAdAccountToken(
  accessToken: string,
  adAccountId: string,
  appId: string,
  userId: string,
  businessId: string,
) {
  return pool.query(
    `insert into ad_accounts (user_id, app_id, ad_account_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, ad_account_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, adAccountId, accessToken, businessId],
  );
}

async function saveDatasetToken(
  accessToken: string,
  datasetId: string,
  appId: string,
  userId: string,
  businessId: string,
) {
  return pool.query(
    `insert into datasets (user_id, app_id, dataset_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, dataset_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, datasetId, accessToken, businessId],
  );
}

async function saveCatalogToken(
  accessToken: string,
  catalogId: string,
  appId: string,
  userId: string,
  businessId: string,
) {
  return pool.query(
    `insert into catalogs (user_id, app_id, catalog_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, catalog_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, catalogId, accessToken, businessId],
  );
}

async function saveInstagramAccountToken(
  accessToken: string,
  instagramAccountId: string,
  appId: string,
  userId: string,
  businessId: string,
) {
  return pool.query(
    `insert into instagram_accounts (user_id, app_id, instagram_account_id, access_token, business_id, last_updated)
     values ($1, $2, $3, $4, $5, current_timestamp)
     on conflict (user_id, app_id, instagram_account_id)
     do update set access_token = excluded.access_token, business_id = excluded.business_id, last_updated = current_timestamp`,
    [userId, appId, instagramAccountId, accessToken, businessId],
  );
}

async function saveBusinessToken(accessToken: string, businessId: string, appId: string, userId: string) {
  return pool.query(
    `insert into businesses (user_id, app_id, business_id, access_token, last_updated)
     values ($1, $2, $3, $4, current_timestamp)
     on conflict (user_id, app_id, business_id)
     do update set access_token = excluded.access_token, last_updated = current_timestamp`,
    [userId, appId, businessId, accessToken],
  );
}

export async function saveTokens(
  userId: string,
  appId: string,
  businessId: string,
  pageIds: string[],
  adAccountIds: string[],
  wabaIds: string[],
  datasetIds: string[],
  catalogIds: string[],
  instagramAccountIds: string[],
  accessToken: string,
) {
  const operations: Promise<unknown>[] = [saveBusinessToken(accessToken, businessId, appId, userId)];
  pageIds.forEach((pageId) => operations.push(savePageToken(accessToken, pageId, appId, userId, businessId)));
  adAccountIds.forEach((adAccountId) => operations.push(saveAdAccountToken(accessToken, adAccountId, appId, userId, businessId)));
  wabaIds.forEach((wabaId) => operations.push(saveWabaToken(accessToken, wabaId, appId, userId, businessId)));
  datasetIds.forEach((datasetId) => operations.push(saveDatasetToken(accessToken, datasetId, appId, userId, businessId)));
  catalogIds.forEach((catalogId) => operations.push(saveCatalogToken(accessToken, catalogId, appId, userId, businessId)));
  instagramAccountIds.forEach((instagramAccountId) =>
    operations.push(saveInstagramAccountToken(accessToken, instagramAccountId, appId, userId, businessId)),
  );
  return Promise.all(operations);
}

export async function registerNumber(phoneId: string, accessToken: string) {
  return graphApiWrapperPost(`/${phoneId}/register`, accessToken, {
    messaging_product: 'whatsapp',
    pin: env.FB_REG_PIN || '123456',
  });
}

export async function deregisterNumber(phoneId: string, accessToken: string) {
  return graphApiWrapperPost(`/${phoneId}/deregister`, accessToken);
}

export async function requestCode(phoneId: string, accessToken: string) {
  return graphApiWrapperPost(`/${phoneId}/request_code?code_method=SMS&language=en`, accessToken);
}

export async function verifyCode(phoneId: string, accessToken: string, otpCode: string) {
  const data = await graphApiWrapperPost(`/${phoneId}/verify_code?code=${encodeURIComponent(otpCode)}`, accessToken);
  if (data.error) {
    throw data.error;
  }
  return data;
}

export async function send(phoneNumberId: string, accessToken: string, destPhone: string, messageContent: string) {
  return graphApiWrapperPost(`/${phoneNumberId}/messages`, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destPhone,
    type: 'text',
    text: {
      preview_url: true,
      body: messageContent,
    },
  });
}

export async function graphApiCallAction(
  userId: string,
  wabaId: string,
  phoneNumberId: string,
  body: Record<string, unknown>,
) {
  const token = await getTokenForWaba(wabaId, userId);
  return graphApiWrapperPost(`/${phoneNumberId}/calls`, token, body);
}

export async function graphApiCallPermissionsGet(
  userId: string,
  wabaId: string,
  phoneNumberId: string,
  userWaId: string,
) {
  const cacheKey = `permissions:${phoneNumberId}:${userWaId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  const token = await getTokenForWaba(wabaId, userId);
  const result = await graphApiWrapperGet(`/${phoneNumberId}/call_permissions?user_wa_id=${encodeURIComponent(userWaId)}`, token);
  cache.set(cacheKey, result, 30000); // 30s TTL
  return result;
}

export async function graphApiGetCallSettings(userId: string, wabaId: string, phoneNumberId: string) {
  const token = await getTokenForWaba(wabaId, userId);
  return graphApiWrapperGet(`/${phoneNumberId}/settings`, token);
}

export async function graphApiUpdateCallSettings(
  userId: string,
  wabaId: string,
  phoneNumberId: string,
  enabled: boolean,
) {
  const token = await getTokenForWaba(wabaId, userId);
  return graphApiWrapperPost(`/${phoneNumberId}/settings`, token, {
    calling: {
      status: enabled ? 'ENABLED' : 'DISABLED',
      callback_permission_status: enabled ? 'ENABLED' : 'DISABLED',
    },
  });
}

export async function graphApiEnableCallingWithToken(phoneNumberId: string, accessToken: string) {
  return graphApiWrapperPost(`/${phoneNumberId}/settings`, accessToken, {
    calling: {
      status: 'ENABLED',
      callback_permission_status: 'ENABLED',
    },
  });
}

export async function graphApiSendCallPermissionRequest(
  userId: string,
  wabaId: string,
  phoneNumberId: string,
  to: string,
  bodyText: string,
) {
  const token = await getTokenForWaba(wabaId, userId);
  return graphApiWrapperPost(`/${phoneNumberId}/messages`, token, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'call_permission_request',
      body: { text: bodyText },
      action: { name: 'call_permission_request' },
    },
  });
}

export async function getTokenForWaba(wabaId: string, userId: string, appId = env.FB_APP_ID) {
  const cacheKey = `waba_token:${wabaId}:${userId}:${appId}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const result = await pool.query(
    'select access_token from wabas where waba_id = $1 and user_id = $2 and app_id = $3 limit 1',
    [wabaId, userId, appId],
  );
  if (!result.rows[0]?.access_token) {
    throw new Error(`No access token found for WABA ${wabaId}`);
  }
  const token = result.rows[0].access_token as string;
  cache.set(cacheKey, token, 10000); // 10s TTL
  return token;
}

export async function getTokenForWabaByUser(wabaId: string, userId: string, appId = env.FB_APP_ID) {
  const cacheKey = `waba_token_user:${wabaId}:${userId}:${appId}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const result = await pool.query(
    'select access_token from wabas where waba_id = $1 and user_id = $2 and app_id = $3 limit 1',
    [wabaId, userId, appId],
  );
  const token = (result.rows[0]?.access_token as string | undefined) ?? null;
  if (token) {
    cache.set(cacheKey, token, 10000); // 10s TTL
  }
  return token;
}

export async function getMessageTemplates(wabaId: string, accessToken: string) {
  const cacheKey = `templates:${wabaId}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  const data = await graphApiWrapperGet(`/${wabaId}/message_templates?fields=name,language,status,components,category&limit=1000`, accessToken);
  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch message templates');
  }
  const templates = data.data || [];
  const sendableStatuses = ['APPROVED', 'QUALITY_PENDING'];
  const filtered = templates.filter((template: { status?: string }) => sendableStatuses.includes(template.status ?? ''));
  cache.set(cacheKey, filtered, 30000); // 30s TTL
  return filtered;
}

export async function checkWabaPaymentMethod(wabaId: string, accessToken: string) {
  const cacheKey = `payment:${wabaId}`;
  const cached = cache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  let hasPaymentMethod = false;
  try {
    const healthData = await graphApiWrapperGet(`/${wabaId}?fields=health_status`, accessToken);
    if (healthData && !healthData.error && healthData.health_status) {
      const entities = healthData.health_status.entities || [];
      const wabaEntity = entities.find((entity: { entity_type?: string }) => entity.entity_type === 'WABA');
      const hasPaymentError =
        wabaEntity?.errors?.some((err: { possible_solution?: string }) =>
          String(err.possible_solution ?? '').toLowerCase().includes('payment method'),
        ) ?? false;
      hasPaymentMethod = !hasPaymentError;
    }
  } catch (error) {
    console.error('checkWabaPaymentMethod error:', error);
  }
  cache.set(cacheKey, hasPaymentMethod, 30000); // 30s TTL
  return hasPaymentMethod;
}

export async function getTemplateGatingData(wabaId: string, accessToken: string) {
  const cacheKey = `gating:${wabaId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  let hasPaymentMethod = false;
  let hasApprovedTemplates = false;

  try {
    const [paymentResult, templateData] = await Promise.all([
      checkWabaPaymentMethod(wabaId, accessToken),
      graphApiWrapperGet(`/${wabaId}/message_templates?fields=name,status&limit=100`, accessToken).catch(() => null),
    ]);

    hasPaymentMethod = paymentResult;

    if (templateData && !templateData.error) {
      const templates = templateData.data || [];
      const sendableStatuses = ['APPROVED', 'QUALITY_PENDING'];
      hasApprovedTemplates = templates.some((template: { status?: string }) =>
        sendableStatuses.includes(template.status ?? ''),
      );
    }
  } catch (error) {
    console.error('getTemplateGatingData error:', error);
  }

  const gatingData = { hasPaymentMethod, hasApprovedTemplates };
  cache.set(cacheKey, gatingData, 30000); // 30s TTL
  return gatingData;
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  templateLanguage: string,
  components: unknown[],
  bizOpaqueCallbackData?: string,
) {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components,
    },
  };

  if (bizOpaqueCallbackData) {
    payload.biz_opaque_callback_data = bizOpaqueCallbackData;
  }

  const data = await graphApiWrapperPost(`/${phoneNumberId}/messages`, accessToken, payload);
  if (data.error) {
    const error = new Error(data.error.message || 'Graph API error');
    Object.assign(error, { status: 400, graphApiError: data.error });
    throw error;
  }

  return data;
}
