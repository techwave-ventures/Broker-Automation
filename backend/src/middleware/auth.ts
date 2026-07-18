import type { Request, Response, NextFunction } from 'express';
import { env, isAuthBypassed } from '../config/env.js';
import { verifyAccessToken } from '../config/auth0.js';

export type AuthenticatedRequest = Request & {
  auth?: {
    sub?: string;
    email?: string;
    name?: string;
  };
};

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (isAuthBypassed) {
      req.auth = {
        email: env.TP_CONTACT_EMAIL ?? 'dev@localhost',
        name: 'Local Dev User',
        sub: 'local-dev',
      };
      return next();
    }

    const authorization = req.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing bearer token' });
    }

    const payload = await verifyAccessToken(token);
    req.auth = {
      sub: typeof payload.sub === 'string' ? payload.sub : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };

    return next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
}
