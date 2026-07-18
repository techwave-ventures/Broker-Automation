import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env.js';

const issuer = env.AUTH0_ISSUER_BASE_URL.replace(/\/$/, '');
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, jwks, {
    issuer,
    audience: env.AUTH0_AUDIENCE,
  });

  return result.payload;
}
