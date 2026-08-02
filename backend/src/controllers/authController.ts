import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { env, isAuthBypassed } from '../config/env.js';
import { signJWT, verifyJWT, type JWTPayload } from '../config/jwt.js';
import { createUser, findUserByEmail, findUserById } from '../models/userModel.js';
import { pool } from '../lib/db.js';
import { getPhoneNumberDetails } from '../services/business.js';

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

export async function sendOtp(req: Request, res: Response) {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Validation Error', message: 'Phone number is required' });
    }
    // SMS OTP verification is removed/disabled as requested. Always return success.
    return res.status(200).json({ success: true, message: 'OTP verification is bypassed' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal Error', message: error.message || 'Failed to send OTP code' });
  }
}

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, name, phone } = req.body || {};

    if (!email || !password || !phone) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, password, and phone number are required' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one symbol'
      });
    }

    // 2. Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User Exists', message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const user = await createUser({
      user_id: userId,
      email,
      password_hash: passwordHash,
      name: name || email.split('@')[0],
      phone,
    });

    const payload: JWTPayload = {
      sub: user.user_id,
      user_id: user.user_id,
      email: user.email,
      name: user.name || null,
      avatar: user.avatar || null,
    };

    const token = await signJWT(payload);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal Error', message: error.message || 'Failed to create user account' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const email = req.body?.email || req.query?.email;
    const password = req.body?.password || req.query?.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
    }

    const user = await findUserByEmail(String(email));
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const payload: JWTPayload = {
      sub: user.user_id,
      user_id: user.user_id,
      email: user.email,
      name: user.name || null,
      avatar: user.avatar || null,
    };

    const token = await signJWT(payload);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal Error', message: error.message || 'Authentication failed' });
  }
}

export async function me(req: Request, res: Response) {
  if (isAuthBypassed) {
    return res.json({
      user: {
        email: env.TP_CONTACT_EMAIL ?? 'dev@localhost',
        name: 'Local Dev User',
        sub: 'local-dev',
        user_id: 'local-dev',
      },
    });
  }

  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const token = cookies['session_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active session' });
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session token' });
  }

  return res.json({ user: payload });
}

export function logout(req: Request, res: Response) {
  res.clearCookie('session_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.json({ success: true, message: 'Logged out successfully' });
}

export async function getWabas(req: Request, res: Response) {
  try {
    let userId = 'local-dev';
    if (!isAuthBypassed) {
      const cookies = parseCookies(req.headers.cookie);
      const authHeader = req.headers.authorization;
      const token = cookies['session_token'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const payload = await verifyJWT(token);
      if (!payload) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      userId = payload.user_id || payload.email;
    }

    const wabasRes = await pool.query(
      `SELECT waba_id, business_id, app_id, last_updated, access_token FROM wabas WHERE user_id = $1 ORDER BY last_updated DESC`,
      [userId]
    );

    const phonesRes = await pool.query(
      `SELECT phone_id, display_phone_number FROM phones WHERE user_id = $1`,
      [userId]
    );

    const enrichedPhones = [];
    const accessToken = wabasRes.rows[0]?.access_token;

    if (accessToken) {
      for (const phone of phonesRes.rows) {
        try {
          const details = await getPhoneNumberDetails(phone.phone_id, accessToken);
          enrichedPhones.push({
            phone_id: phone.phone_id,
            display_phone_number: details.display_phone_number || phone.display_phone_number || '',
            quality_rating: details.quality_rating || 'UNKNOWN',
            status: details.status || 'UNKNOWN',
            messaging_limit: details.whatsapp_business_manager_messaging_limit || 'UNKNOWN',
          });
        } catch (err) {
          console.error(`Failed to fetch Meta details for phone ${phone.phone_id}:`, err);
          enrichedPhones.push({
            phone_id: phone.phone_id,
            display_phone_number: phone.display_phone_number || '',
            quality_rating: 'UNKNOWN',
            status: 'UNKNOWN',
            messaging_limit: 'UNKNOWN',
          });
        }
      }
    } else {
      for (const phone of phonesRes.rows) {
        enrichedPhones.push({
          phone_id: phone.phone_id,
          display_phone_number: phone.display_phone_number || '',
          quality_rating: 'UNKNOWN',
          status: 'UNKNOWN',
          messaging_limit: 'UNKNOWN',
        });
      }
    }

    const wabasClean = wabasRes.rows.map(({ access_token, ...rest }) => rest);

    return res.json({
      wabas: wabasClean,
      phones: enrichedPhones,
    });
  } catch (err) {
    console.error('Failed to get user WABAs:', err);
    return res.status(500).json({ error: 'Failed to retrieve WhatsApp accounts' });
  }
}
