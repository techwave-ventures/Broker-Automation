import * as jose from 'jose';
import { env } from './env.js';

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export interface JWTPayload {
  sub: string; // user_id
  user_id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

export async function signJWT(payload: JWTPayload, expiresIn = '7d'): Promise<string> {
  return await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}
