import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { enqueueJob } from '../lib/queue.js';
import type { WebhookPayloadModel } from '../modules/models.js';

export async function getWebhookChallenge(req: Request, res: Response) {
  const mode = String(req.query['hub.mode'] ?? '');
  const verifyToken = String(req.query['hub.verify_token'] ?? '');
  const challenge = String(req.query['hub.challenge'] ?? '');

  console.log(`\n================================================================`);
  console.log(`🔔 [WEBHOOK VERIFY] Incoming Meta Verification Challenge`);
  console.log(`Mode: ${mode} | Token: ${verifyToken}`);
  console.log(`================================================================\n`);

  if (mode === 'subscribe' && verifyToken === env.FB_VERIFY_TOKEN) {
    console.log(`✅ [WEBHOOK VERIFY SUCCESS] Verification token matched! Responding with challenge.`);
    return res.status(200).send(challenge);
  }

  console.warn(`⚠️ [WEBHOOK VERIFY FAILED] Verification token did not match expected env.FB_VERIFY_TOKEN`);
  return res.json({ status: 'ok' });
}

export async function postWebhook(req: Request, res: Response) {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

    if (env.FB_APP_SECRET) {
      const signature = req.header('x-hub-signature-256');
      if (!signature) {
        console.warn(`⚠️ [WEBHOOK REJECTED] Missing x-hub-signature-256 header`);
        return res.json({ status: 'ok' });
      }

      const expected = `sha256=${crypto.createHmac('sha256', env.FB_APP_SECRET).update(rawBody).digest('hex')}`;
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        console.warn(`⚠️ [WEBHOOK REJECTED] Signature mismatch`);
        return res.json({ status: 'ok' });
      }
    }

    const data = JSON.parse(rawBody) as WebhookPayloadModel;

    console.log(`\n================================================================`);
    console.log(`📥 [WEBHOOK EVENT RECEIVED] ${new Date().toISOString()}`);
    console.log(JSON.stringify(data, null, 2));
    console.log(`================================================================\n`);

    // Enqueue job for background processing
    await enqueueJob('webhook_process', data);

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ [WEBHOOK ERROR]:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
