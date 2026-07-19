import { Auth0Client } from '@auth0/nextjs-auth0/server';

const _auth0 = new Auth0Client();

const bypassAuth = process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'development';

// Mock session for local development bypass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSession: any = {
  user: {
    email: process.env.TP_CONTACT_EMAIL ?? 'dev@localhost',
    name: 'Local Dev User',
    sub: 'local-dev',
  },
};

export const auth0 = bypassAuth
  ? ({
      ..._auth0,
      getSession: async () => mockSession,
      getAccessToken: async () => ({ accessToken: 'mock-dev-token' }),
      middleware: _auth0.middleware.bind(_auth0),
    } as any)
  : _auth0;
