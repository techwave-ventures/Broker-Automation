import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { pool } from './db.js';
import {
  send,
  sendTemplateMessage,
  registerNumber,
  subscribeWebhook,
  graphApiEnableCallingWithToken,
  saveTokens,
} from '../services/business.js';
import { publishToChannel } from './ably.js';
import {
  findOrCreateConversation,
  saveMessage,
  updateMessageStatus,
} from '../models/conversationModel.js';

export const redisConnection = {
  url: env.REDIS_URL || 'redis://localhost:6379',
};

export const whatsappQueue = new Queue('whatsapp-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

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
      delay: 60000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });

  return job.id as string;
}

// Handler functions for BullMQ Worker
export async function handleWhatsappSend(payload: any) {
  const { phoneNumberId, accessToken, destPhone, messageContent, wabaId } = payload;
  
  const result = await send(phoneNumberId, accessToken, destPhone, messageContent);
  const messageId = result?.messages?.[0]?.id || `out-${Date.now()}`;

  // Find owner user_id
  let userId = 'local-dev';
  if (wabaId) {
    const wabaRes = await pool.query('SELECT user_id FROM wabas WHERE waba_id = $1 LIMIT 1', [wabaId]);
    if (wabaRes.rows[0]?.user_id) {
      userId = wabaRes.rows[0].user_id;
    }
  }

  const conversation = await findOrCreateConversation(userId, destPhone, undefined, phoneNumberId);
  await saveMessage({
    conversationId: conversation.id,
    wabaId: wabaId || undefined,
    phoneNumberId,
    messageId,
    senderNumber: phoneNumberId,
    recipientNumber: destPhone,
    senderType: 'bot',
    messageType: 'text',
    body: messageContent,
    direction: 'outbound',
    status: 'sent',
  });

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

  let userId = 'local-dev';
  if (wabaId) {
    const wabaRes = await pool.query('SELECT user_id FROM wabas WHERE waba_id = $1 LIMIT 1', [wabaId]);
    if (wabaRes.rows[0]?.user_id) {
      userId = wabaRes.rows[0].user_id;
    }
  }

  const conversation = await findOrCreateConversation(userId, to, undefined, phoneNumberId);
  await saveMessage({
    conversationId: conversation.id,
    wabaId: wabaId || undefined,
    phoneNumberId,
    messageId,
    senderNumber: phoneNumberId,
    recipientNumber: to,
    senderType: 'bot',
    messageType: 'template',
    body: `template: ${templateName}`,
    direction: 'outbound',
    status: 'sent',
  });

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
      const contactObj = value?.contacts?.[0];
      const customerName = contactObj?.profile?.name;

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
            await updateMessageStatus(msgId, status);
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

          // Find owner user_id from WABA
          let userId = 'local-dev';
          const wabaRes = await pool.query('SELECT user_id FROM wabas WHERE waba_id = $1 LIMIT 1', [wabaId]);
          if (wabaRes.rows[0]?.user_id) {
            userId = wabaRes.rows[0].user_id;
          }

          // 1. Find or Create Conversation
          const conversation = await findOrCreateConversation(
            userId,
            senderNumber,
            customerName,
            metadata.display_phone_number || phoneNumberId
          );

          // 2. Save linked Message
          await saveMessage({
            conversationId: conversation.id,
            wabaId,
            phoneNumberId,
            messageId,
            senderNumber,
            recipientNumber: phoneNumberId,
            senderType: 'customer',
            messageType: 'text',
            body,
            direction: 'inbound',
            status: 'delivered',
          });

          // Get WABA token for auto-reply
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

          // Enqueue outbound reply
          await enqueueJob('whatsapp_send', {
            phoneNumberId,
            accessToken,
            destPhone: senderNumber,
            messageContent: ackText,
            wabaId: entry.id,
          });

          // Publish to Ably
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
