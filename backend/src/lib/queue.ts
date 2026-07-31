import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { pool } from './db.js';
import { cashfreeFetch } from './cashfree.js';
import {
  send,
  sendTemplateMessage,
  registerNumber,
  subscribeWebhook,
  graphApiEnableCallingWithToken,
  saveTokens,
} from '../services/business.js';
import { sendImageMessage } from './meta.js';
import { publishToChannel } from './websocket.js';
import { createLead, getLeadsByUser } from '../models/Lead.js';
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
import { formatOutboundMessages, OutboundMessage } from '../services/whatsappFormatter.js';

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

export const geminiQueue = new Queue('gemini-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

export async function enqueueGeminiReplyJob(payload: any) {
  await geminiQueue.add('gemini_reply', payload, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}


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
  } else if (type === 'update_rolling_summary') {
    priority = 5;
  }

  const job = await whatsappQueue.add(type, payload, {
    priority,
    attempts: 6,
    backoff: {
      type: 'custom',
    },
    removeOnComplete: true,
    removeOnFail: false,
  });

  return job.id as string;
}

export async function handleUpdateRollingSummary(payload: any) {
  const { conversationId, currentSummary, lastTurns } = payload;
  const updatedSummary = await updateRollingSummary(currentSummary, lastTurns);
  console.log(`📝 [BACKGROUND SUMMARY UPDATE] Conversation ${conversationId} - Old: "${currentSummary}" ➔ New: "${updatedSummary}"`);
  await updateConversationAIState(conversationId, {
    rolling_summary: updatedSummary
  });
}

export async function deductCreditsAndCheckAutoRecharge(userId: string, amount: number, description: string) {
  try {
    // 1. Deduct credits
    const updateRes = await pool.query(
      `UPDATE users 
       SET credits_balance = credits_balance - $1 
       WHERE user_id = $2 
       RETURNING credits_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold, cashfree_subscription_id, plan_type`,
      [amount, userId]
    );

    if (updateRes.rows.length === 0) return;

    const user = updateRes.rows[0];
    const newBalance = user.credits_balance ?? 0;

    // Log transaction
    await pool.query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, 'message_charge', $3)`,
      [userId, -amount, description]
    );

    const threshold = typeof user.auto_recharge_threshold === 'number' ? user.auto_recharge_threshold : 200;

    // 2. Trigger Auto-Recharge if balance is below threshold and auto-recharge is enabled
    if (newBalance < threshold && user.auto_recharge_enabled) {
      const refillCredits = user.auto_recharge_amount || 5000;
      console.log(`⚡ [AUTO-RECHARGE] Credit balance (${newBalance}) fell below threshold (${threshold}) for user ${userId}. Initiating refill of ${refillCredits} credits.`);
      
      let rate = 1.00;
      if (user.plan_type === 'custom') {
        if (refillCredits >= 10000) rate = 0.80;
        else rate = 0.90;
      }
      const chargeAmountINR = refillCredits * rate;

      // Charge Cashfree Subscription if ID is present
      if (user.cashfree_subscription_id) {
        try {
          const chargePayload = {
            amount: chargeAmountINR,
            charge_id: `auto_${userId.substring(0, 8)}_${Date.now()}`,
            scheduled_date: new Date().toISOString().split('T')[0],
          };
          await cashfreeFetch(`/subscriptions/${user.cashfree_subscription_id}/charge`, {
            method: 'POST',
            body: JSON.stringify(chargePayload),
          });
          console.log(`⚡ [AUTO-RECHARGE CASHFREE SUCCESS] Charged ₹${chargeAmountINR} for subscription ${user.cashfree_subscription_id}`);
        } catch (cfErr: any) {
          console.error(`❌ [AUTO-RECHARGE CASHFREE FAILED] Failed to charge saved payment method:`, cfErr.message);
        }
      }

      // Refill credits
      await pool.query(
        `UPDATE users SET credits_balance = credits_balance + $1 WHERE user_id = $2`,
        [refillCredits, userId]
      );

      // Record transaction
      await pool.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, 'top_up', $3)`,
        [userId, refillCredits, `Auto-recharge top-up: ${refillCredits} credits (Charged ₹${chargeAmountINR.toFixed(2)})`]
      );
      console.log(`⚡ [AUTO-RECHARGE SUCCESS] Refilled ${refillCredits} credits for user ${userId}.`);
    }
  } catch (err) {
    console.error('❌ Error executing deductCreditsAndCheckAutoRecharge:', err);
  }
}

// Handler functions for BullMQ Worker
export async function handleWhatsappSend(payload: any) {
  const { phoneNumberId, accessToken, destPhone, messageContent, wabaId, senderType = 'bot', dbMessageId } = payload;

  console.log(`\n----------------------------------------------------------------`);
  console.log(`⚙️ [QUEUE WORKER] Processing 'whatsapp_send' job...`);
  console.log(`Sender Type: ${senderType} | Phone ID: ${phoneNumberId} | WABA ID: ${wabaId}`);
  console.log(`Destination: ${destPhone} | Message Content: "${messageContent}"`);

  // Find owner user_id
  let userId = 'local-dev';
  if (wabaId) {
    const wabaRes = await pool.query('SELECT user_id FROM wabas WHERE waba_id = $1 LIMIT 1', [wabaId]);
    if (wabaRes.rows[0]?.user_id) {
      userId = wabaRes.rows[0].user_id;
      console.log(`👤 [QUEUE WORKER] Resolved owner user_id to: ${userId}`);
    }
  }

  // Verify credit balance
  const userCheck = await pool.query('SELECT credits_balance FROM users WHERE user_id = $1 LIMIT 1', [userId]);
  if (userCheck.rows.length > 0 && (userCheck.rows[0].credits_balance ?? 0) <= 0) {
    console.warn(`❌ [SEND BLOCKED] Outbound message to ${destPhone} blocked for user ${userId} due to insufficient credits.`);
    throw new Error('Insufficient credits to send WhatsApp messages.');
  }
  console.log(`💰 [QUEUE WORKER] Credit check passed (balance: ${userCheck.rows[0]?.credits_balance ?? 0})`);

  console.log(`🌐 [QUEUE WORKER] Transmitting text message via Meta Graph API...`);
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
    console.error(`❌ [OUTBOUND SEND FAILED] Meta Graph API Error for ${destPhone}:`, JSON.stringify(result.error));
    throw new Error(`Meta API Error (${result.error.code}): ${result.error.message || JSON.stringify(result.error)}`);
  }

  const messageId = result?.messages?.[0]?.id || `out-${Date.now()}`;
  console.log(`📨 [QUEUE WORKER] Meta API successfully sent message. Assigned messageId: ${messageId}`);

  const conversation = await findOrCreateConversation(userId, destPhone, undefined, phoneNumberId);
  console.log(`💬 [QUEUE WORKER] Found/Created conversation ID: ${conversation.id}`);

  if (senderType === 'agent') {
    console.log(`🤝 [QUEUE WORKER] Sender type is agent. Switching conversation ID ${conversation.id} to human_takeover status.`);
    await pool.query(
      "UPDATE conversations SET status = 'human_takeover', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [conversation.id]
    );
    await publishToChannel('get-started', 'webhook', {
      type: 'status_change',
      conversationId: conversation.id,
      status: 'human_takeover'
    });
  }

  if (dbMessageId) {
    console.log(`💾 [QUEUE WORKER] Updating existing DB message ID ${dbMessageId} with Meta messageId: ${messageId}`);
    await pool.query(
      `UPDATE messages 
       SET message_id = $1, waba_id = $2, phone_number_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5`,
      [messageId, wabaId || null, phoneNumberId || null, 'sent', dbMessageId]
    );
  } else {
    console.log(`💾 [QUEUE WORKER] Saving new message record to PostgreSQL...`);
    await saveMessage({
      conversationId: conversation.id,
      wabaId: wabaId || undefined,
      phoneNumberId,
      messageId,
      senderNumber: phoneNumberId,
      recipientNumber: destPhone,
      senderType,
      messageType: 'text',
      body: messageContent,
      direction: 'outbound',
      status: 'sent',
    });
  }

  // Deduct 1 credit for outbound service message
  const cost = 1;
  console.log(`💳 [QUEUE WORKER] Charging ${cost} credit for outbound message...`);
  await deductCreditsAndCheckAutoRecharge(userId, cost, 'Outbound service window message');
  
  if (dbMessageId) {
    await pool.query('UPDATE messages SET credits_charged = $1 WHERE id = $2', [cost, dbMessageId]);
  } else {
    await pool.query('UPDATE messages SET credits_charged = $1 WHERE message_id = $2', [cost, messageId]);
  }

  console.log(`🤖 [OUTBOUND MESSAGE SENT] Sent to ${destPhone}: "${messageContent}"`);
  console.log(`----------------------------------------------------------------\n`);
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
    category,
  } = payload;

  // Find owner user_id
  let userId = 'local-dev';
  if (wabaId) {
    const wabaRes = await pool.query('SELECT user_id FROM wabas WHERE waba_id = $1 LIMIT 1', [wabaId]);
    if (wabaRes.rows[0]?.user_id) {
      userId = wabaRes.rows[0].user_id;
    }
  }

  // Determine cost
  const isMarketing = String(category || '').toLowerCase() === 'marketing' || 
                      String(templateName || '').toLowerCase().includes('marketing') ||
                      String(templateName || '').toLowerCase().includes('promo') ||
                      String(templateName || '').toLowerCase().includes('offer');
  const cost = isMarketing ? 3 : 1;

  // Verify credit balance
  const userCheck = await pool.query('SELECT credits_balance FROM users WHERE user_id = $1 LIMIT 1', [userId]);
  if (userCheck.rows.length > 0 && (userCheck.rows[0].credits_balance ?? 0) < cost) {
    console.warn(`❌ [TEMPLATE SEND BLOCKED] Outbound template to ${to} blocked for user ${userId} due to insufficient credits (Need ${cost}).`);
    throw new Error(`Insufficient credits to send template message. Need ${cost} credits.`);
  }

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

  // Deduct credits based on message type
  await deductCreditsAndCheckAutoRecharge(
    userId, 
    cost, 
    `Outbound template message (${isMarketing ? 'marketing' : 'utility'})`
  );
  await pool.query('UPDATE messages SET credits_charged = $1 WHERE message_id = $2', [cost, messageId]);

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

          // If the message is from the business display number itself, ignore it (it's an echoed outbound message)
          const displayPhone = metadata?.display_phone_number ? metadata.display_phone_number.replace(/\D/g, '') : '';
          const senderClean = senderNumber.replace(/\D/g, '');
          if (displayPhone && senderClean === displayPhone) {
            console.log(`ℹ️ [WEBHOOK] Ignoring echoed outbound message from business number: ${senderNumber}`);
            continue;
          }

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

          // FIX 1: Acquire a per-conversation PostgreSQL advisory lock to prevent concurrent
          // workers from processing the same conversation at the same time (race condition fix).
          const lockAcquired = await pool.query(
            'SELECT pg_try_advisory_xact_lock($1)',
            [conversation.id]
          );
          if (!lockAcquired.rows[0]?.pg_try_advisory_xact_lock) {
            console.warn(`⚠️ [LOCK] Another worker is already processing conversation ${conversation.id}. Skipping to prevent duplicate reply.`);
            continue;
          }

          // FIX 2: Skip if the bot already replied to this conversation in the last 5 seconds
          // (secondary safety net against race conditions and Meta webhook retries).
          const recentBotReply = await pool.query(
            `SELECT id FROM messages
             WHERE conversation_id = $1 AND sender_type = 'bot' AND direction = 'outbound'
             AND created_at > NOW() - INTERVAL '5 seconds'
             LIMIT 1`,
            [conversation.id]
          );
          if (recentBotReply.rows.length > 0) {
            console.warn(`⚠️ [DEDUP] Skipping AI reply — bot already replied to conversation ${conversation.id} within the last 5 seconds.`);
            continue;
          }

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

          // 3. Process AI auto-reply if enabled
          if (conversation.status !== 'human_takeover') {
            const botConfigResult = await pool.query(
              'SELECT is_auto_reply_enabled FROM bot_configs WHERE phone_id = $1 LIMIT 1',
              [phoneNumberId]
            );
            const botConfig = botConfigResult.rows[0];
            const isAutoReplyEnabled = botConfig ? (botConfig.is_auto_reply_enabled === true) : true;
            if (isAutoReplyEnabled) {
              await enqueueGeminiReplyJob({
                conversationId: conversation.id,
                phoneNumberId,
                wabaId: entry.id,
                senderNumber,
                userId,
                body,
                intentResult,
              });
            }
          }
        }
      }
    }
  }
}

export async function handleGeminiReply(payload: any) {
  const { conversationId, phoneNumberId, wabaId, senderNumber, userId, body, intentResult } = payload;
  console.log(`📥 [GEMINI PROCESS] Starting reply generation for Conversation ID: ${conversationId}, Customer: ${senderNumber}, Input Message: "${body}"`);

  // Retrieve latest conversation state
  const convRes = await pool.query('SELECT * FROM conversations WHERE id = $1 LIMIT 1', [conversationId]);
  const conversation = convRes.rows[0];
  if (!conversation || conversation.status === 'human_takeover') return;

  // Fetch the latest message to see if we've already replied
  const latestMsgRes = await pool.query(
    'SELECT direction FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
    [conversationId]
  );
  if (latestMsgRes.rows.length > 0 && latestMsgRes.rows[0].direction === 'outbound') {
    console.log(`ℹ️ [GEMINI PROCESS] Latest message in conversation ${conversationId} is already outbound. Skipping duplicate reply.`);
    return;
  }

  const botConfigResult = await pool.query(
    'SELECT bot_instructions, is_auto_reply_enabled FROM bot_configs WHERE phone_id = $1 LIMIT 1',
    [phoneNumberId]
  );
  const botConfig = botConfigResult.rows[0];
  if (botConfig && botConfig.is_auto_reply_enabled === false) {
    console.log(`ℹ️ [GEMINI PROCESS] Auto-reply is disabled for phone ${phoneNumberId}. Skipping reply.`);
    return;
  }
  const instructions = botConfig?.bot_instructions || 'You are a helpful real estate assistant.';

  // A. Fetch recent message history (last 4 messages)
  const messagesRes = await pool.query(
    'SELECT body, sender_type FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 16',
    [conversationId]
  );
  const history = messagesRes.rows.reverse().map((row: any) => ({
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
  let messagesToSend: OutboundMessage[] = [];
  try {
    const { generateAutoReply } = await import('../services/gemini.js');
    const structuredRes = await generateAutoReply(
      instructions,
      history,
      conversation.ai_state,
      propertiesContext || 'No property listings are currently available.',
      conversationId
    );

    // Merge intent/slots from Gemini if not already deterministically resolved
    if (intentResult.intent === 'UNKNOWN' && structuredRes.intent) {
      intentResult.intent = structuredRes.intent as any;
      console.log(`🔍 [INTENT EXTRACTED FROM GEMINI] ${intentResult.intent}`);
    }

    const slotsToMerge: Record<string, any> = {};
    if (structuredRes.slots) {
      for (const [key, value] of Object.entries(structuredRes.slots)) {
        if (value !== null && value !== undefined) {
          if (key === 'beds') {
            slotsToMerge[key] = typeof value === 'string' ? parseInt(value, 10) : value;
          } else {
            slotsToMerge[key] = value;
          }
        }
      }
    }

    // Resolve state machine transitions & recommendations
    const prevStage = conversation.ai_state.stage;
    const nextStateUpdates = resolveNextState(conversation.ai_state, intentResult, structuredRes);

    // Add rolling summary and any newly extracted slots to database updates
    if (structuredRes.updated_rolling_summary) {
      nextStateUpdates.rolling_summary = structuredRes.updated_rolling_summary;
    }
    const mergedUpdates = { ...slotsToMerge, ...nextStateUpdates };

    console.log(`⚙️ [STATE MACHINE] Transitioning stage: ${prevStage} -> ${mergedUpdates.stage}`);
    conversation.ai_state = await updateConversationAIState(conversationId, mergedUpdates);

    // ── Auto Lead Promotion ─────────────────────────────────────
    if (mergedUpdates.stage === 'SITE_VISIT' && prevStage !== 'SITE_VISIT') {
      try {
        let leadUserId = userId;
        const emailRes = await pool.query('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
        if (emailRes.rows[0]?.email) leadUserId = emailRes.rows[0].email;

        const existing = await getLeadsByUser(leadUserId);
        const alreadyExists = existing.some(l => l.customerPhone === senderNumber);

        if (!alreadyExists) {
          const aiState = conversation.ai_state;
          const targetPropertyIds = Array.isArray(aiState.interested_property_ids) && aiState.interested_property_ids.length > 0
            ? aiState.interested_property_ids
            : (Array.isArray(aiState.recommended_property_ids) ? aiState.recommended_property_ids : []);

          const primaryPropertyId = targetPropertyIds.length > 0
            ? String(targetPropertyIds[0])
            : undefined;

          const propertyListString = targetPropertyIds.length > 0
            ? `Target Property IDs: ${targetPropertyIds.join(', ')}`
            : '';

          const newLead = await createLead(
            {
              customerName: conversation.customer_name || senderNumber,
              customerPhone: senderNumber,
              requestedLocality: aiState.locality || undefined,
              budget: aiState.budget || undefined,
              otherReqs: [
                aiState.property_type,
                aiState.beds ? `${aiState.beds} BHK` : null,
                aiState.furnishing,
                propertyListString,
              ].filter(Boolean).join(', ') || undefined,
              interestedPropertyId: primaryPropertyId,
              appointmentDate: structuredRes.appointmentDate || null,
              status: 'Upcoming Visit',
              leadScore: 'High',
            },
            leadUserId
          );

          console.log(`🏠 [LEAD CREATED] Auto-promoted conversation ${conversationId} → Lead ${newLead.key} for ${senderNumber}`);
        }
      } catch (leadErr) {
        console.error('❌ [LEAD AUTO-PROMOTE] Failed to create lead from conversation:', leadErr);
      }
    }

    messagesToSend = formatOutboundMessages(structuredRes, properties);
    console.log(`🤖 [GEMINI RESPONSE] Action: ${structuredRes.action}. Generated ${messagesToSend.length} sequential messages.`);
  } catch (aiErr: any) {
    if (aiErr.name === 'AbortError' || aiErr.message?.includes('Aborted')) {
      console.log(`[ABORT] Skipping reply processing for conversation ${conversationId} due to abortion.`);
      return;
    }
    console.error('❌ Failed to generate AI reply via Gemini API:', aiErr);
    messagesToSend = [{ text: 'Thank you for reaching out! One of our agents will contact you shortly.' }];
  }

  // Get WABA token for auto-reply
  const accessTokenResult = await pool.query(
    'SELECT access_token FROM wabas WHERE waba_id = $1 LIMIT 1',
    [wabaId]
  );
  const accessToken = accessTokenResult.rows[0]?.access_token;
  if (!accessToken) return;

  // D & E. Save and Send bot messages sequentially
  for (let i = 0; i < messagesToSend.length; i++) {
    const msg: OutboundMessage = messagesToSend[i];
    console.log(`[GEMINI PROCESS] Sending outbound message ${i + 1}/${messagesToSend.length} to ${senderNumber} sequentially...`);

    if (msg.imageUrl) {
      try {
        console.log(`[GEMINI PROCESS] Transmitting image message with caption to Meta Graph API...`);
        const result = await sendImageMessage(phoneNumberId, accessToken, senderNumber, msg.imageUrl, msg.text);

        if (result?.error) {
          throw new Error(`Meta API Image Error (${result.error.code}): ${result.error.message || JSON.stringify(result.error)}`);
        }

        const messageId = result?.messages?.[0]?.id || `out-${Date.now()}`;
        await saveMessage({
          conversationId,
          wabaId,
          phoneNumberId,
          messageId,
          senderNumber: phoneNumberId,
          recipientNumber: senderNumber,
          senderType: 'bot',
          messageType: 'image',
          body: msg.text,
          imageUrl: msg.imageUrl,
          direction: 'outbound',
          status: 'sent',
        });
        
        // Deduct 1 credit for outbound image message
        const cost = 1;
        await deductCreditsAndCheckAutoRecharge(userId, cost, 'Outbound image message');
        await pool.query('UPDATE messages SET credits_charged = $1 WHERE message_id = $2', [cost, messageId]);

        console.log(`[GEMINI PROCESS] Successfully saved and sent image message ${i + 1}`);
      } catch (imgErr: any) {
        console.warn(`[GEMINI PROCESS] Failed to send image, falling back to text. Error: ${imgErr.message}`);
        await handleWhatsappSend({
          phoneNumberId,
          accessToken,
          destPhone: senderNumber,
          messageContent: msg.text,
          wabaId,
        });
      }
    } else {
      console.log(`[GEMINI PROCESS] Transmitting text message to Meta Graph API...`);
      await handleWhatsappSend({
        phoneNumberId,
        accessToken,
        destPhone: senderNumber,
        messageContent: msg.text,
        wabaId,
      });
      console.log(`[GEMINI PROCESS] Successfully sent text message ${i + 1}`);
    }

    // Add a tiny sleep of 1 second between consecutive messages to ensure strict delivery order
    if (i < messagesToSend.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // F. Publish update to Ably
  await publishToChannel('get-started', 'first', {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: wabaId,
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
                  text: { body: messagesToSend.map(m => m.text).join('\n\n') },
                  timestamp: Math.floor(Date.now() / 1000),
                },
              ],
            },
          },
        ],
      },
    ],
  }).catch(() => { });
}
