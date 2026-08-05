import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Fetch secrets dynamically from AWS Secrets Manager if SECRETS_ARN is provided
if (process.env.SECRETS_ARN) {
  const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  try {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "ap-south-1" });
    const response = await client.send(new GetSecretValueCommand({ SecretId: process.env.SECRETS_ARN }));
    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      Object.assign(process.env, secrets);
    }
  } catch (error) {
    console.error("Failed to load secrets from AWS Secrets Manager:", error);
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  POSTGRES_URL: z.string().min(1),
  FRONTEND_BASE_URL: z.string().min(1),
  BACKEND_BASE_URL: z.string().min(1),
  JWT_SECRET: z.string().default('super-secret-jwt-key-for-broker-automation-32bytes!'),
  BYPASS_AUTH: z.string().optional(),
  TP_CONTACT_EMAIL: z.string().email().optional(),
  FB_APP_ID: z.string().optional(),
  FB_APP_SECRET: z.string().optional(),
  FB_GRAPH_API_VERSION: z.string().default('v22.0'),
  FB_REG_PIN: z.string().optional(),
  FB_VERIFY_TOKEN: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_LOCATION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCP_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // AWS S3 Image Storage
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PUBLIC_URL: z.string().optional(),
  // Cashfree Subscriptions & Billing
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
});

export const env = envSchema.parse(process.env);

export const isAuthBypassed = env.BYPASS_AUTH === 'true' && env.NODE_ENV === 'development';
