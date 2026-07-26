import { env } from '../config/env.js';
import crypto from 'node:crypto';

export async function cashfreeFetch(path: string, options: RequestInit = {}) {
  const appId = env.CASHFREE_APP_ID;
  const secretKey = env.CASHFREE_SECRET_KEY;
  
  if (!appId || !secretKey) {
    throw new Error('Cashfree credentials are not configured');
  }

  const isProduction = env.CASHFREE_ENV === 'production';
  const baseUrl = isProduction 
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  const headers: Record<string, string> = {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cashfree API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function verifyCashfreeSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const secret = env.CASHFREE_SECRET_KEY;
  if (!secret) {
    console.error('Cashfree secret key is not configured');
    return false;
  }

  try {
    const signStr = timestamp + rawBody;
    const generated = crypto
      .createHmac('sha256', secret)
      .update(signStr)
      .digest('base64');
    return generated === signature;
  } catch (err) {
    console.error('Error verifying Cashfree signature:', err);
    return false;
  }
}
