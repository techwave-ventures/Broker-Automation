import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { enqueueJob } from '../lib/queue.js';
import type { WebhookPayloadModel } from '../modules/models.js';

export async function getWebhookChallenge(req: Request, res: Response) {
  const mode = String(req.query['hub.mode'] ?? '');
  const verifyToken = String(req.query['hub.verify_token'] ?? '');
  const challenge = String(req.query['hub.challenge'] ?? '');

  if (mode === 'subscribe' && verifyToken === env.FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

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
        return res.json({ status: 'ok' });
      }

      const expected = `sha256=${crypto.createHmac('sha256', env.FB_APP_SECRET).update(rawBody).digest('hex')}`;
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return res.json({ status: 'ok' });
      }
    }

    const data = JSON.parse(rawBody) as WebhookPayloadModel;

    // Enqueue job for background processing
    await enqueueJob('webhook_process', data);

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
