import { env } from '../config/env.js';

const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const serviceSid = env.TWILIO_VERIFY_SERVICE_SID;

const isTwilioConfigured = !!(accountSid && authToken && serviceSid);

export async function sendVerificationCode(to: string): Promise<{ success: boolean; error?: string }> {
  if (!isTwilioConfigured) {
    console.warn(`⚠️ [TWILIO MOCK] Twilio Verify is not configured. Mocking SMS code send to: ${to}. Use OTP code "123456" to verify.`);
    return { success: true };
  }

  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('Channel', 'sms');

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ [TWILIO ERROR] Failed to send verification code:`, errText);
      return { success: false, error: `Twilio Error: ${res.statusText} (${res.status})` };
    }

    const data = await res.json() as any;
    return { success: data.status === 'pending' };
  } catch (err: any) {
    console.error(`❌ [TWILIO ERROR] Exception sending verification:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function checkVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!isTwilioConfigured) {
    console.warn(`⚠️ [TWILIO MOCK] Mock checking verification code for ${to} with code ${code}.`);
    if (code === '123456') {
      return { success: true };
    }
    return { success: false, error: 'Invalid verification code (Mock mode accepts "123456")' };
  }

  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('Code', code);

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ [TWILIO ERROR] Failed to check verification code:`, errText);
      return { success: false, error: `Twilio Error: ${res.statusText} (${res.status})` };
    }

    const data = await res.json() as any;
    return { success: data.status === 'approved' };
  } catch (err: any) {
    console.error(`❌ [TWILIO ERROR] Exception checking verification:`, err.message);
    return { success: false, error: err.message };
  }
}
