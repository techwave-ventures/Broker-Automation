import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
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
  updateConversationAIState,
} from '../models/conversationModel.js';
import { detectIntent } from '../services/intentDetector.js';
import { resolveNextState } from '../services/stateMachine.js';
import { findMatchingProperties } from '../services/propertyMatcher.js';
import { updateRollingSummary } from '../services/summaryService.js';
import { formatOutboundMessages } from '../services/whatsappFormatter.js';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

// Universal Redis connection with silent error handling and fallback
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 3) return null; // Stop infinite reconnect loop if Redis service is offline
    return Math.min(times * 200, 1000);
  },
  tls: isTls ? { rejectUnauthorized: false } : undefined,
});

redisConnection.on('error', (err) => {
  // Gracefully log Redis connection warnings without crashing
  console.warn('⚠️ [REDIS WARNING] Connection alert:', err.message);
});

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

  let result = await send(phoneNumberId, accessToken, destPhone, messageContent);

  // Auto-recovery for Error 133010 (Account not registered on Cloud API)
  if (result?.error?.code === 133010) {
    console.warn(`⚠️ [AUTO-REGISTERING] Phone ${phoneNumberId} returned Error 133010 (Unregistered). Registering on Cloud API...`);
    const regResult = await registerNumber(phoneNumberId, accessToken);
    if (regResult?.error) {
      console.error(`❌ [AUTO-REGISTRATION FAILED] Failed to register phone ${phoneNumberId}:`, JSON.stringify(regResult.error));
    } else {
      console.log(`✅ [AUTO-REGISTRATION SUCCESS] Phone ${phoneNumberId} registered on Cloud API. Retrying send...`);
      result = await send(phoneNumberId, accessToken, destPhone, messageContent);
    }
  }

  if (result?.error) {
    console.error(`❌ [ACKBOT SEND FAILED] Meta Graph API Error for ${destPhone}:`, JSON.stringify(result.error));
    throw new Error(`Meta API Error (${result.error.code}): ${result.error.message || JSON.stringify(result.error)}`);
  }

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

  console.log(`🤖 [ACKBOT AUTO-REPLY SENT] Sent to ${destPhone}: "${messageContent}"`);
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

  let result = await sendTemplateMessage(
    phoneNumberId,
    accessToken,
    to,
    templateName,
    templateLanguage,
    componentParams || [],
    bizOpaqueCallbackData
  );

  // Auto-recovery for Error 133010 (Account not registered on Cloud API)
  if (result?.error?.code === 133010) {
    console.warn(`⚠️ [AUTO-REGISTERING] Phone ${phoneNumberId} returned Error 133010 (Unregistered). Registering on Cloud API...`);
    const regResult = await registerNumber(phoneNumberId, accessToken);
    if (regResult?.error) {
      console.error(`❌ [AUTO-REGISTRATION FAILED] Failed to register phone ${phoneNumberId}:`, JSON.stringify(regResult.error));
    } else {
      console.log(`✅ [AUTO-REGISTRATION SUCCESS] Phone ${phoneNumberId} registered on Cloud API. Retrying template send...`);
      result = await sendTemplateMessage(
        phoneNumberId,
        accessToken,
        to,
        templateName,
        templateLanguage,
        componentParams || [],
        bizOpaqueCallbackData
      );
    }
  }

  if (result?.error) {
    console.error(`❌ [TEMPLATE SEND FAILED] Meta Graph API Error for ${to}:`, JSON.stringify(result.error));
    throw new Error(`Meta API Error (${result.error.code}): ${result.error.message || JSON.stringify(result.error)}`);
  }

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
          const messageId = message.id;
          const body = message.text.body;

          if (messageId) {
            const dupCheck = await pool.query('SELECT id FROM messages WHERE message_id = $1 LIMIT 1', [messageId]);
            if (dupCheck.rows.length > 0) {
              console.log(`⚠️ [WEBHOOK PROCESS] Skipping duplicate incoming message event: ${messageId}`);
              continue;
            }
          }

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

          // Run Intent and Entity Detection
          const intentResult = await detectIntent(body, conversation.ai_state?.stage || 'GREETING');
          console.log(`🔍 [INTENT DETECTED] Customer message intent: ${intentResult.intent}`, intentResult.slots);

          if (intentResult.intent === 'HUMAN_TAKEOVER') {
            console.log(`🤖 [HUMAN TAKEOVER] Triggered. Disabling AI response for conversation ID: ${conversation.id}`);
            await pool.query(
              "UPDATE conversations SET status = 'human_takeover', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
              [conversation.id]
            );
            
            // Publish status update to Ably so dashboard UI refreshes
            await publishToChannel('get-started', 'webhook', {
              type: 'status_change',
              conversationId: conversation.id,
              status: 'human_takeover'
            });
            continue; // Bypasses Gemini and auto-reply entirely
          }

          // Merge any extracted slots/preferences into conversation.ai_state
          if (intentResult.slots && Object.values(intentResult.slots).some(v => v !== null && v !== undefined)) {
            const slotsToMerge: Record<string, any> = {};
            for (const [key, value] of Object.entries(intentResult.slots)) {
              if (value !== null && value !== undefined) {
                if (key === 'beds') {
                  slotsToMerge[key] = typeof value === 'string' ? parseInt(value, 10) : value;
                } else {
                  slotsToMerge[key] = value;
                }
              }
            }

            if (Object.keys(slotsToMerge).length > 0) {
              console.log(`📝 [SLOTS EXTRACTED] Merging slots into ai_state for conversation ${conversation.id}:`, slotsToMerge);
              conversation.ai_state = await updateConversationAIState(conversation.id, slotsToMerge);
            }
          }

          // Get WABA token for auto-reply
          const accessTokenResult = await pool.query(
            'SELECT access_token FROM wabas WHERE waba_id = $1 LIMIT 1',
            [entry.id]
          );
          const accessToken = accessTokenResult.rows[0]?.access_token;
          if (!accessToken) continue;

          // 3. Process AI auto-reply if enabled
          if (conversation.status !== 'human_takeover') {
            // Check if AI auto-reply is enabled in bot configs
            const botConfigResult = await pool.query(
              'SELECT is_auto_reply_enabled, bot_instructions FROM bot_configs WHERE phone_id = $1 LIMIT 1',
              [phoneNumberId]
            );
            const botConfig = botConfigResult.rows[0];
            // If there's no config in table yet, it defaults to true
            const isAutoReplyEnabled = botConfig ? (botConfig.is_auto_reply_enabled === true) : true;
            if (isAutoReplyEnabled) {
              const instructions = botConfig?.bot_instructions;

              // A. Fetch recent message history (last 4 messages)
              const messagesRes = await pool.query(
                'SELECT body, sender_type FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 4',
                [conversation.id]
              );
              const history = messagesRes.rows.map((row: any) => ({
                role: (row.sender_type === 'customer' ? 'user' : 'model') as 'user' | 'model',
                text: row.body
              }));

              // B. Fetch active properties listings to recommend
              let propertiesUser = userId;
              const userRes = await pool.query('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
              if (userRes.rows[0]?.email) {
                propertiesUser = userRes.rows[0].email;
              }

              // Call the deterministic property matching and ranking logic
              const { contextString: propertiesContext, properties } = await findMatchingProperties(propertiesUser, conversation.ai_state);

              // C. Generate AI reply
              let messagesToSend: string[] = [];
              try {
                const { generateAutoReply } = await import('../services/gemini.js');
                const structuredRes = await generateAutoReply(
                  instructions,
                  history,
                  conversation.ai_state,
                  propertiesContext || 'No property listings are currently available.'
                );

                // Resolve state machine transitions & recommendations
                const nextStateUpdates = resolveNextState(conversation.ai_state, intentResult, structuredRes);
                console.log(`⚙️ [STATE MACHINE] Transitioning stage: ${conversation.ai_state.stage} -> ${nextStateUpdates.stage}`);
                conversation.ai_state = await updateConversationAIState(conversation.id, nextStateUpdates);

                // Format messages sequentially using the WhatsApp formatter
                messagesToSend = formatOutboundMessages(structuredRes, properties);
                console.log(`🤖 [GEMINI RESPONSE] Action: ${structuredRes.action}. Generated ${messagesToSend.length} sequential messages.`);
              } catch (aiErr) {
                console.error('❌ Failed to generate AI reply via Gemini API:', aiErr);
                messagesToSend = ['Thank you for reaching out! One of our agents will contact you shortly.'];
              }

              // D & E. Save and Send bot messages sequentially
              for (let i = 0; i < messagesToSend.length; i++) {
                const msgText = messagesToSend[i];
                const botMessageId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;

                await saveMessage({
                  conversationId: conversation.id,
                  wabaId,
                  phoneNumberId,
                  messageId: botMessageId,
                  senderNumber: phoneNumberId,
                  recipientNumber: senderNumber,
                  senderType: 'bot',
                  messageType: 'text',
                  body: msgText,
                  direction: 'outbound',
                  status: 'sent',
                });

                try {
                  await enqueueJob('whatsapp_send', {
                    phoneNumberId,
                    accessToken,
                    destPhone: senderNumber,
                    messageContent: msgText,
                    wabaId: entry.id,
                  });
                } catch (queueErr: any) {
                  console.warn('⚠️ [REDIS OFFLINE FALLBACK] Enqueuing failed, sending directly via WhatsApp API...');
                  await handleWhatsappSend({
                    phoneNumberId,
                    accessToken,
                    destPhone: senderNumber,
                    messageContent: msgText,
                    wabaId: entry.id,
                  });
                }
              }

              // Update rolling summary in background
              if (messagesToSend.length > 0) {
                try {
                  const combinedReply = messagesToSend.join('\n');
                  const lastTurns = [
                    { role: 'user', text: body },
                    { role: 'model', text: combinedReply }
                  ];
                  const updatedSummary = await updateRollingSummary(conversation.ai_state.rolling_summary || '', lastTurns);
                  console.log(`📝 [SUMMARY UPDATE] Old: "${conversation.ai_state.rolling_summary}" ➔ New: "${updatedSummary}"`);
                  conversation.ai_state = await updateConversationAIState(conversation.id, {
                    rolling_summary: updatedSummary
                  });
                } catch (sumErr) {
                  console.error('❌ Failed to update rolling summary:', sumErr);
                }
              }

              // F. Publish update to Ably
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
                              from: '_bot_',
                              type: 'text',
                              text: { body: aiReplyText },
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
  }
}
