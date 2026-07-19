import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env.js';

const issuer = `https://${env.AUTH0_DOMAIN}/`;
const jwks = createRemoteJWKSet(new URL('.well-known/jwks.json', issuer));

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, jwks, {
    issuer,
    audience: `https://${env.AUTH0_DOMAIN}/api/v2/`,
  });

  return result.payload;
}
