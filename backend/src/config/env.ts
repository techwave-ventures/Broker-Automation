import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  POSTGRES_URL: z.string().min(1),
  APP_BASE_URL: z.string().min(1),
  JWT_SECRET: z.string().default('super-secret-jwt-key-for-broker-automation-32bytes!'),
  BYPASS_AUTH: z.string().optional(),
  TP_CONTACT_EMAIL: z.string().email().optional(),
  FB_APP_ID: z.string().optional(),
  FB_APP_SECRET: z.string().optional(),
  FB_GRAPH_API_VERSION: z.string().default('v22.0'),
  FB_REG_PIN: z.string().optional(),
  FB_VERIFY_TOKEN: z.string().optional(),
  ABLY_KEY: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

export const env = envSchema.parse(process.env);

export const isAuthBypassed = env.BYPASS_AUTH === 'true' && env.NODE_ENV === 'development';
