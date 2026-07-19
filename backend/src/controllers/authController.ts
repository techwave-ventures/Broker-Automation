import type { Request, Response } from 'express';
import * as jose from 'jose';
import { env } from '../config/env.js';

// Convert AUTH0_SECRET into a 256-bit symmetric key for JWE encryption
const secretKey = jose.base64url.decode(jose.base64url.encode(env.AUTH0_SECRET.slice(0, 32)));

export async function encryptSession(payload: any): Promise<string> {
  return await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .encrypt(secretKey);
}

export async function decryptSession(jwt: string): Promise<any | null> {
  try {
    const { payload } = await jose.jwtDecrypt(jwt, secretKey);
    return payload;
  } catch (error) {
    console.error('Session decryption failed:', error);
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const val = parts.slice(1).join('=')?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(val);
    }
  });
  return cookies;
}

export function login(req: Request, res: Response) {
  const state = Math.random().toString(36).substring(2);
  const redirectUri = `${env.APP_BASE_URL}/api/auth/callback`;
  
  let screenHint = '';
  if (req.query.screen_hint === 'signup') {
    screenHint = '&screen_hint=signup';
  }

  const authUrl = `https://${env.AUTH0_DOMAIN}/authorize?` +
    `response_type=code` +
    `&client_id=${env.AUTH0_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid%20email%20profile` +
    `&state=${state}` +
    screenHint;

  return res.redirect(authUrl);
}

export async function callback(req: Request, res: Response) {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const redirectUri = `${env.APP_BASE_URL}/api/auth/callback`;
    const tokenResponse = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: env.AUTH0_CLIENT_ID,
        client_secret: env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    // Decode ID Token payload
    const payloadBase64 = idToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    // Create session details
    const sessionPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || null,
      picture: payload.picture || null,
    };

    const encryptedSession = await encryptSession(sessionPayload);

    // Set secure HTTP-only cookie
    res.cookie('session_token', encryptedSession, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const frontendUrl = env.NODE_ENV === 'production'
      ? 'https://broker-automation.vercel.app/dashboard'
      : 'http://localhost:3000/dashboard';

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('Callback error:', error);
    return res.status(500).send('Authentication failed');
  }
}

export async function me(req: Request, res: Response) {
  // Support developer local bypass
  if (env.BYPASS_AUTH === 'true' && env.NODE_ENV === 'development') {
    return res.json({
      user: {
        email: env.TP_CONTACT_EMAIL ?? 'dev@localhost',
        name: 'Local Dev User',
        sub: 'local-dev',
      }
    });
  }

  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['session_token'];

  if (!sessionToken) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active session' });
  }

  const payload = await decryptSession(sessionToken);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session' });
  }

  return res.json({ user: payload });
}

export function logout(req: Request, res: Response) {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  const returnTo = env.NODE_ENV === 'production'
    ? 'https://broker-automation.vercel.app'
    : 'http://localhost:3000';

  const auth0LogoutUrl = `https://${env.AUTH0_DOMAIN}/v2/logout?client_id=${env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(returnTo)}`;
  return res.redirect(auth0LogoutUrl);
}
