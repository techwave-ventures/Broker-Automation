import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-broker-automation-32bytes!';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionUser {
  user: {
    email: string;
    name?: string | null;
    sub: string;
    user_id?: string;
  };
}

export const auth0 = {
  getSession: async (): Promise<SessionUser | null> => {
    if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'development') {
      return {
        user: {
          email: process.env.TP_CONTACT_EMAIL ?? 'dev@localhost',
          name: 'Local Dev User',
          sub: 'local-dev',
          user_id: 'local-dev',
        },
      };
    }

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('session_token')?.value;

      if (!token) return null;

      const { payload } = await jose.jwtVerify(token, secretKey);
      if (!payload) return null;

      return {
        user: {
          email: String(payload.email || ''),
          name: typeof payload.name === 'string' ? payload.name : null,
          sub: String(payload.sub || payload.user_id || ''),
          user_id: String(payload.user_id || payload.sub || ''),
        },
      };
    } catch (error) {
      return null;
    }
  },
  middleware: async (request: any) => {
    return null;
  },
};
