import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { pool } from './db.js';
import {
  send,
  sendTemplateMessage,
  saveTokens,
  registerNumber,
  subscribeWebhook,
  graphApiEnableCallingWithToken,
} from '../services/business.js';
import { publishToChannel } from './ably.js';

// Setup connection config for Redis by parsing the connection URL
const redisUrl = new URL(env.REDIS_URL);
export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
};

// Initialize the main queue
export const whatsappQueue = new Queue('whatsapp-jobs', {
  connection: redisConnection,
});

/**
 * Enqueues a task to BullMQ with priority and backoff rules.
 * 
 * Priorities (lower number runs first):
 * - 1: whatsapp_send (immediate chat responses)
 * - 2: whatsapp_template_send (paid templates/notifications)
 * - 3: token_exchange_followup (account registrations)
 * - 4: webhook_process (inbound message logging/receipts)
 */
export async function enqueueJob(type: string, payload: any) {
  let priority = 4;
  if (type === 'whatsapp_send') {
    priority = 1;
  } else if (type === 'whatsapp_template_send') {
    priority = 2;
  } else if (type === 'token_exchange_followup') {
    priority = 3;
  } else if (type === 'webhook_process') {
    priority = 4;
  }

  const job = await whatsappQueue.add(type, payload, {
    priority,
    attempts: 6,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute base delay
    },
    removeOnComplete: true, // Keep Redis memory clean
    removeOnFail: false,    // Retain failed jobs for inspection
  });

  return job.id as string;
}

// Handler functions for BullMQ Worker
export async function handleWhatsappSend(payload: any) {
  const { phoneNumberId, accessToken, destPhone, messageContent, wabaId } = payload;
  
  const result = await send(phoneNumberId, accessToken, destPhone, messageContent);
  const messageId = result?.messages?.[0]?.id || `out-${Date.now()}`;

  await pool.query(
    `INSERT INTO messages (waba_id, phone_number_id, message_id, sender_number, recipient_number, message_type, body, direction, status)
     VALUES ($1, $2, $3, $4, $5, 'text', $6, 'outbound', 'sent')
     ON CONFLICT (message_id) DO UPDATE SET status = 'sent', updated_at = CURRENT_TIMESTAMP`,
    [wabaId || null, phoneNumberId, messageId, phoneNumberId, destPhone, messageContent]
  );

  return result;
}

export async function handleWhatsappTemplateSend(payload: any) {
  const {
    phoneNumberId,
    accessToken,
    to,
    templateName,
    templateLanguage,
    componentParams,
    bizOpaqueCallbackData,
    wabaId,
  } = payload;

  const result = await sendTemplateMessage(
    phoneNumberId,
    accessToken,
    to,
    templateName,
    templateLanguage,
    componentParams || [],
    bizOpaqueCallbackData
  );
  
  const messageId = result?.messages?.[0]?.id || `out-temp-${Date.now()}`;

  await pool.query(
    `INSERT INTO messages (waba_id, phone_number_id, message_id, sender_number, recipient_number, message_type, body, direction, status)
     VALUES ($1, $2, $3, $4, $5, 'template', $6, 'outbound', 'sent')
     ON CONFLICT (message_id) DO UPDATE SET status = 'sent', updated_at = CURRENT_TIMESTAMP`,
    [wabaId || null, phoneNumberId, messageId, phoneNumberId, to, `template: ${templateName}`,]
  );

  return result;
}

export async function handleTokenExchangeFollowup(payload: any) {
  const {
    userId,
    appId,
    businessId,
    pageIds,
    adAccountIds,
    wabaIds,
    datasetIds,
    catalogIds,
    instagramAccountIds,
    accessToken,
    es_option_reg,
    es_option_sub,
    es_option_calling,
    phone_number_id,
    wabaId,
  } = payload;

  const ops: Promise<any>[] = [
    saveTokens(
      userId,
      appId,
      businessId,
      pageIds || [],
      adAccountIds || [],
      wabaIds || [],
      datasetIds || [],
      catalogIds || [],
      instagramAccountIds || [],
      accessToken
    ),
  ];

  if (es_option_reg && phone_number_id) {
    ops.push(registerNumber(phone_number_id, accessToken));
  }
  if (es_option_sub && wabaId) {
    ops.push(subscribeWebhook(accessToken, wabaId));
  }
  if (es_option_calling && phone_number_id) {
    ops.push(graphApiEnableCallingWithToken(phone_number_id, accessToken));
  }

  await Promise.all(ops);
}

export async function handleWebhookProcess(payload: any) {
  const data = payload;
  await publishToChannel('get-started', 'webhook', data);

  if (data.object !== 'whatsapp_business_account') {
    return;
  }

  for (const entry of data.entry ?? []) {
    const wabaId = entry.id;
    for (const change of entry.changes ?? []) {
      const field = change.field;
      const value = change.value;
      const metadata = value?.metadata;

      // Persist raw webhook events in Postgres
      if (field) {
        await pool.query(
          `INSERT INTO messaging_events (waba_id, phone_number_id, event_type, event_id, payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            wabaId || null,
            metadata?.phone_number_id || null,
            field,
            value?.statuses?.[0]?.id || value?.calls?.[0]?.id || value?.messages?.[0]?.id || null,
            JSON.stringify(value),
          ]
        );
      }

      if (field === 'calls') {
        const call = value?.calls?.[0];
        await publishToChannel('get-started', 'call', {
          type: 'call_event',
          event: call?.event,
          phoneNumberId: metadata?.phone_number_id,
          displayPhoneNumber: metadata?.display_phone_number,
          callerNumber: call?.from,
          wabaId,
          callId: call?.id,
          sdp: call?.session?.sdp,
          sdpType: call?.session?.sdp_type,
        });

        await publishToChannel('get-started', 'call', {
          type: 'call_status',
          status: value?.statuses?.[0]?.status,
          phoneNumberId: metadata?.phone_number_id,
          displayPhoneNumber: metadata?.display_phone_number,
          wabaId,
          callId: value?.statuses?.[0]?.id,
        });
      }

      // Handle message status updates (sent, delivered, read)
      if (value?.statuses && value.statuses.length > 0) {
        for (const statusObj of value.statuses) {
          const status = statusObj.status;
          const msgId = statusObj.id;
          if (msgId && status) {
            await pool.query(
              `UPDATE messages
               SET status = $1, updated_at = CURRENT_TIMESTAMP
               WHERE message_id = $2`,
              [status, msgId]
            );
          }
        }
      }

      if (field === 'messages' || !field) {
        const message = value?.messages?.[0];
        if (message?.type === 'text' && message.text?.body && metadata?.phone_number_id && entry.id) {
          const phoneNumberId = metadata.phone_number_id;
          const senderNumber = message.from ?? '';
          const body = message.text.body;
          const messageId = message.id;

          // Store incoming message in DB
          await pool.query(
            `INSERT INTO messages (waba_id, phone_number_id, message_id, sender_number, recipient_number, message_type, body, direction, status)
             VALUES ($1, $2, $3, $4, $5, 'text', $6, 'inbound', 'delivered')
             ON CONFLICT (message_id) DO NOTHING`,
            [wabaId, phoneNumberId, messageId, senderNumber, phoneNumberId, body]
          );

          // Get WABA token
          const accessTokenResult = await pool.query(
            'SELECT access_token FROM wabas WHERE waba_id = $1 LIMIT 1',
            [entry.id]
          );
          const accessToken = accessTokenResult.rows[0]?.access_token;
          if (!accessToken) continue;

          // Check if ack bot is enabled
          const phoneResult = await pool.query(
            'SELECT is_ack_bot_enabled, ack_bot_message FROM phones WHERE phone_id = $1 LIMIT 1',
            [phoneNumberId]
          );
          const isAckBotEnabled = phoneResult.rows[0]?.is_ack_bot_enabled === true;
          if (!isAckBotEnabled) continue;

          const customMessage = phoneResult.rows[0]?.ack_bot_message;
          const ackText = customMessage || `ack: ${body}`;

          // Enqueue the outbound reply to the queue
          await enqueueJob('whatsapp_send', {
            phoneNumberId,
            accessToken,
            destPhone: senderNumber,
            messageContent: ackText,
            wabaId: entry.id,
          });

          // Publish status update to Ably
          await publishToChannel('get-started', 'first', {
            object: 'whatsapp_business_account',
            entry: [
              {
                id: entry.id,
                changes: [
                  {
                    field: 'messages',
                    value: {
                      messaging_product: 'whatsapp',
                      metadata: { phone_number_id: phoneNumberId },
                      messages: [
                        {
                          from: '_ackbot_',
                          type: 'text',
                          text: { body: ackText },
                          timestamp: Math.floor(Date.now() / 1000),
                          _ackbot_recipient: senderNumber,
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          });
        }
      }
    }
  }
}
