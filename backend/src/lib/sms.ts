import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from '../config/env.js';
import { redisConnection } from './queue.js';

const isSnsConfigured = !!(
  env.AWS_REGION &&
  env.AWS_ACCESS_KEY_ID &&
  env.AWS_SECRET_ACCESS_KEY
);

const snsClient = isSnsConfigured
  ? new SNSClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

// Local fallback in case Redis connection is offline
const localOtpStore = new Map<string, { code: string; expiresAt: number }>();

// Clean up expired local OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of localOtpStore.entries()) {
    if (data.expiresAt < now) {
      localOtpStore.delete(phone);
    }
  }
}, 60 * 1000);

export async function sendVerificationCode(to: string): Promise<{ success: boolean; error?: string }> {
  if (!isSnsConfigured) {
    console.warn(`⚠️ [SNS MOCK] AWS SNS is not configured. Mocking SMS code send to: ${to}. Use OTP code "123456" to verify.`);
    return { success: true };
  }

  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in local store first
    const expiresAt = Date.now() + 5 * 60 * 1000;
    localOtpStore.set(to, { code: otpCode, expiresAt });

    // Store in Redis (expiration 5 minutes / 300 seconds)
    try {
      await redisConnection.set(`otp:${to}`, otpCode, 'EX', 300);
    } catch (err: any) {
      console.warn('⚠️ [REDIS WARNING] Failed to save OTP to Redis, using local in-memory fallback:', err.message);
    }

    const messageAttributes: Record<string, any> = {};

    if (env.AWS_SNS_SENDER_ID) {
      messageAttributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: env.AWS_SNS_SENDER_ID,
      };
    }
    if (env.AWS_SNS_ENTITY_ID) {
      messageAttributes['AWS.MM.SMS.EntityId'] = {
        DataType: 'String',
        StringValue: env.AWS_SNS_ENTITY_ID,
      };
    }
    if (env.AWS_SNS_TEMPLATE_ID) {
      messageAttributes['AWS.MM.SMS.TemplateId'] = {
        DataType: 'String',
        StringValue: env.AWS_SNS_TEMPLATE_ID,
      };
    }

    const command = new PublishCommand({
      PhoneNumber: to,
      Message: `Your verification code is: ${otpCode}`,
      MessageAttributes: Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined,
    });

    if (!snsClient) {
      throw new Error('SNS client is not initialized');
    }

    await snsClient.send(command);
    return { success: true };
  } catch (err: any) {
    console.error(`❌ [SNS ERROR] Exception sending verification:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function checkVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!isSnsConfigured) {
    console.warn(`⚠️ [SNS MOCK] Mock checking verification code for ${to} with code ${code}.`);
    if (code === '123456') {
      return { success: true };
    }
    return { success: false, error: 'Invalid verification code (Mock mode accepts "123456")' };
  }

  try {
    let storedCode: string | null = null;

    try {
      storedCode = await redisConnection.get(`otp:${to}`);
    } catch (err: any) {
      console.warn('⚠️ [REDIS WARNING] Failed to read OTP from Redis, using local in-memory fallback:', err.message);
    }

    // Fallback to local memory store if not found in Redis or Redis was unavailable
    if (!storedCode) {
      const local = localOtpStore.get(to);
      if (local && local.expiresAt > Date.now()) {
        storedCode = local.code;
      }
    }

    if (storedCode && storedCode === code) {
      // Clear OTP on successful verification
      localOtpStore.delete(to);
      try {
        await redisConnection.del(`otp:${to}`);
      } catch (err) {
        // Ignored
      }
      return { success: true };
    }

    return { success: false, error: 'Invalid or expired verification code' };
  } catch (err: any) {
    console.error(`❌ [SNS ERROR] Exception checking verification:`, err.message);
    return { success: false, error: err.message };
  }
}
