import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { getToken, saveTokens } from '../services/business.js';
import { pool } from '../lib/db.js';
import { wrapOperation } from '../lib/operation.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { tokenExchangeSchema, type TokenExchangeInput } from '../modules/schemas.js';
import { enqueueJob } from '../lib/queue.js';

export async function postTokenExchange(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.user_id || req.auth?.email || req.auth?.sub;
  if (!userId) {
    return jsonError(res, 401, 'Missing user session');
  }

  try {
    const body = parseBody<TokenExchangeInput>(tokenExchangeSchema, req.body);
    const appId = body.app_id ?? env.FB_APP_ID;
    if (!appId) {
      return jsonError(res, 400, 'Missing Facebook App ID');
    }

    const wabaId = body.waba_id;
    const wabaIds = body.waba_ids ?? (wabaId ? [wabaId] : []);
    const pageIds = body.page_ids ?? [];
    const adAccountIds = body.ad_account_ids ?? [];
    const datasetIds = body.dataset_ids ?? [];
    const catalogIds = body.catalog_ids ?? [];
    const instagramAccountIds = body.instagram_account_ids ?? [];

    console.log(`\n🔑 [TOKEN EXCHANGE STARTED] User: ${userId} | WABA: ${wabaId || wabaIds.join(', ')}`);

    const tokenResult = await wrapOperation('getToken', getToken(body.code, appId));
    if (tokenResult.status !== 'completed' || !tokenResult.result) {
      console.error('❌ Token exchange failed with error:', tokenResult.error);
      return res.status(500).json({ error: 'Failed to exchange token', details: tokenResult.error });
    }

    const accessToken = tokenResult.result as string;

    // 1. Synchronously save WABA & Business tokens to PostgreSQL
    try {
      await saveTokens(
        userId,
        appId,
        body.business_id || '',
        pageIds,
        adAccountIds,
        wabaIds,
        datasetIds,
        catalogIds,
        instagramAccountIds,
        accessToken
      );

      // 2. Synchronously save phone number to PostgreSQL
      if (body.phone_number_id) {
        let displayPhone = null;
        try {
          const metaRes = await fetch(`https://graph.facebook.com/${env.FB_GRAPH_API_VERSION}/${body.phone_number_id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const metaData = await metaRes.json();
          if (metaData && metaData.display_phone_number) {
            displayPhone = metaData.display_phone_number.replace(/[^0-9]/g, '');
          }
        } catch (metaErr) {
          console.error('Error fetching display phone number during token exchange:', metaErr);
        }

        await pool.query(
          `INSERT INTO phones (phone_id, user_id, is_ack_bot_enabled, display_phone_number, last_updated)
           VALUES ($1, $2, TRUE, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (phone_id) DO UPDATE SET user_id = EXCLUDED.user_id, display_phone_number = EXCLUDED.display_phone_number, last_updated = CURRENT_TIMESTAMP`,
          [body.phone_number_id, userId, displayPhone]
        );
      }

      console.log(`✅ [DB DB_SYNC_SUCCESS] Saved WABA (${wabaIds.join(', ')}) & Phone (${body.phone_number_id}) for User: ${userId}`);
    } catch (dbErr) {
      console.error('⚠️ [DB DB_SYNC_ERROR] Direct database insert warning:', dbErr);
    }

    // 3. Enqueue follow-up operations for background execution
    await enqueueJob('token_exchange_followup', {
      userId,
      appId,
      businessId: body.business_id,
      pageIds,
      adAccountIds,
      wabaIds,
      datasetIds,
      catalogIds,
      instagramAccountIds,
      accessToken,
      es_option_reg: body.es_option_reg,
      es_option_sub: body.es_option_sub,
      es_option_calling: body.es_option_calling,
      phone_number_id: body.phone_number_id,
      wabaId,
    });

    const operations = [
      { fun: 'saveTokens', status: 'completed', result: null, error: null },
      body.es_option_reg && body.phone_number_id
        ? { fun: 'registerNumber', status: 'completed', result: null, error: null }
        : { fun: 'registerNumber', status: 'skipped', result: null, error: null },
      body.es_option_sub && wabaId
        ? { fun: 'subscribeWebhook', status: 'completed', result: null, error: null }
        : { fun: 'subscribeWebhook', status: 'skipped', result: null, error: null },
      body.es_option_calling && body.phone_number_id
        ? { fun: 'enableCalling', status: 'completed', result: null, error: null }
        : { fun: 'enableCalling', status: 'skipped', result: null, error: null },
    ];

    return res.json([[{ fun: tokenResult.fun, status: tokenResult.status, result: '***', error: tokenResult.error }, operations]]);
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to exchange token:', error);
    return res.status(500).json({ error: 'Failed to exchange token' });
  }
}
