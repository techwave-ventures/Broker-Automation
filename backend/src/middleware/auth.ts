import type { Request, Response, NextFunction } from 'express';
import { env, isAuthBypassed } from '../config/env.js';
import { verifyJWT } from '../config/jwt.js';
import { parseCookies } from '../controllers/authController.js';

export type AuthenticatedRequest = Request & {
  auth?: {
    sub?: string;
    user_id?: string;
    email?: string;
    name?: string;
  };
};

export async function clearExpiredSessionCookie(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['session_token'];
    if (token) {
      const payload = await verifyJWT(token);
      if (!payload) {
        res.clearCookie('session_token', {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        if (req.headers.cookie) {
          const cookieList = req.headers.cookie.split(';').map(c => c.trim());
          const filtered = cookieList.filter(c => !c.startsWith('session_token='));
          req.headers.cookie = filtered.join('; ');
        }
      }
    }
  } catch (error) {
    console.error('Error checking global session cookie:', error);
  }
  next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (isAuthBypassed) {
      req.auth = {
        email: env.TP_CONTACT_EMAIL ?? 'dev@localhost',
        name: 'Local Dev User',
        sub: 'local-dev',
        user_id: 'local-dev',
      };
      return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const authorization = req.header('authorization');
    const token = cookies['session_token'] || (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing session cookie or bearer token' });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session token' });
    }

    req.auth = {
      sub: payload.sub || payload.user_id,
      user_id: payload.user_id || payload.sub,
      email: payload.email,
      name: payload.name || undefined,
    };

    return next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication verification failed' });
  }
}
