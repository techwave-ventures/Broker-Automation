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

    const isProd = env.NODE_ENV === 'production';
    if (isProd && !env.FB_APP_SECRET) {
      console.error(`❌ [WEBHOOK ERROR] FB_APP_SECRET is not configured in production/staging environment! Rejecting request.`);
      return res.status(401).json({ error: 'Unauthorized: Missing webhook app secret configuration' });
    }

    if (env.FB_APP_SECRET) {
      const signature = req.header('x-hub-signature-256');
      if (!signature) {
        console.warn(`⚠️ [WEBHOOK REJECTED] Missing x-hub-signature-256 header`);
        return res.status(401).json({ error: 'Unauthorized: Missing signature' });
      }

      const expected = `sha256=${crypto.createHmac('sha256', env.FB_APP_SECRET).update(rawBody).digest('hex')}`;
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        console.warn(`⚠️ [WEBHOOK REJECTED] Signature mismatch`);
        return res.status(401).json({ error: 'Unauthorized: Signature mismatch' });
      }
    }

    const data = JSON.parse(rawBody) as WebhookPayloadModel;



    // Check if the payload contains any actual incoming user messages
    let hasMessages = false;
    if (data.entry) {
      for (const entry of data.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value?.messages && change.value.messages.length > 0) {
              hasMessages = true;
              break;
            }
          }
        }
        if (hasMessages) break;
      }
    }

    if (hasMessages) {
      // Enqueue message processing job (handles LLM / Gemini)
      await enqueueJob('webhook_process', data);
    } else {
      // Process status updates and non-message events inline asynchronously
      // to bypass the BullMQ worker queue entirely
      import('../lib/queue.js').then(({ handleWebhookProcess }) => {
        handleWebhookProcess(data).catch(err => {
          console.error('❌ Error processing non-message webhook inline:', err);
        });
      }).catch(err => {
        console.error('❌ Failed to load queue module for inline webhook processing:', err);
      });
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ [WEBHOOK ERROR]:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
