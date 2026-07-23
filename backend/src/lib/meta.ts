import { env } from '../config/env.js';
import { pool } from './db.js';
import { metaRateLimiter } from './rateLimiter.js';
import { cache } from './cache.js';

type GraphApiPayload = Record<string, unknown>;

function graphApiUrl(path: string) {
  return `https://graph.facebook.com/${env.FB_GRAPH_API_VERSION}${path}`;
}

async function graphGet(path: string, accessToken?: string) {
  return metaRateLimiter.limit(async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(graphApiUrl(path), { method: 'GET', headers, cache: 'no-store' });
    return response.json();
  });
}

async function graphPost(path: string, accessToken: string, body: GraphApiPayload = {}) {
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

export async function verifyWebhookChallenge(mode: string, verifyToken: string, challenge: string) {
  if (mode === 'subscribe' && verifyToken && verifyToken === env.FB_VERIFY_TOKEN) {
    return challenge;
  }

  return null;
}

export async function exchangeShortLivedToken(code: string, redirectUri: string) {
  const path = `/oauth/access_token?client_id=${env.FB_APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&client_secret=${env.FB_APP_SECRET}&code=${encodeURIComponent(code)}`;
  return graphGet(path);
}

export async function sendTextMessage(phoneNumberId: string, accessToken: string, to: string, body: string) {
  return graphPost(`/${phoneNumberId}/messages`, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: true,
      body,
    },
  });
}

export async function getWabaAccessToken(wabaId: string, userId: string) {
  const result = await pool.query('select access_token from wabas where waba_id = $1 and user_id = $2 limit 1', [
    wabaId,
    userId,
  ]);

  return result.rows[0]?.access_token ?? null;
}

export async function getAckBotStatus(phoneId: string) {
  const cacheKey = `ack_bot_status:${phoneId}`;
  const cached = cache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  const result = await pool.query('select is_ack_bot_enabled from phones where phone_id = $1 limit 1', [phoneId]);
  const status = result.rows[0]?.is_ack_bot_enabled === true;
  cache.set(cacheKey, status, 10000); // 10s TTL
  return status;
}

export async function getAckBotMessage(phoneId: string) {
  const cacheKey = `ack_bot_message:${phoneId}`;
  const cached = cache.get<string>(cacheKey);
  if (cached !== null) return cached;

  const result = await pool.query('select ack_bot_message from phones where phone_id = $1 limit 1', [phoneId]);
  const message = result.rows[0]?.ack_bot_message ?? '';
  cache.set(cacheKey, message, 10000); // 10s TTL
  return message;
}
