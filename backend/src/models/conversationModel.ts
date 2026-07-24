import { pool } from '../lib/db.js';

export interface ConversationAIState {
  transaction_type: 'Sell' | 'Rent' | null;
  locality: string | null;
  city: string | null;
  budget: string | null;
  beds: number | null;
  property_type: string | null;
  amenities: string[];
  parking: string | null;
  furnishing: string | null;
  move_in_date: string | null;
  purpose: string | null;
  recommended_property_ids: number[];
  stage: 'GREETING' | 'COLLECT_INFO' | 'SEARCHING' | 'RECOMMENDING' | 'SITE_VISIT' | 'FOLLOW_UP' | 'COMPLETED';
  rolling_summary: string;
}

export interface Conversation {
  id: number;
  user_id: string;
  business_phone: string | null;
  customer_phone: string;
  customer_name: string | null;
  status: 'bot_active' | 'human_takeover';
  last_message_text: string | null;
  last_message_at: Date;
  unread_count: number;
  ai_state: ConversationAIState;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  waba_id?: string;
  phone_number_id?: string;
  message_id?: string;
  sender_number?: string;
  recipient_number?: string;
  sender_type: 'customer' | 'bot' | 'agent';
  message_type: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  created_at: Date;
}

export async function findOrCreateConversation(
  userId: string,
  customerPhone: string,
  customerName?: string,
  businessPhone?: string
): Promise<Conversation> {
  const existing = await pool.query(
    `SELECT * FROM conversations WHERE user_id = $1 AND customer_phone = $2`,
    [userId, customerPhone]
  );

  if (existing.rows.length > 0) {
    if (customerName && !existing.rows[0].customer_name) {
      await pool.query(
        `UPDATE conversations SET customer_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [customerName, existing.rows[0].id]
      );
      existing.rows[0].customer_name = customerName;
    }
    return existing.rows[0];
  }

  const result = await pool.query(
    `INSERT INTO conversations (user_id, customer_phone, customer_name, business_phone)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, customerPhone, customerName || null, businessPhone || null]
  );

  return result.rows[0];
}

export async function saveMessage(params: {
  conversationId: number;
  wabaId?: string;
  phoneNumberId?: string;
  messageId?: string;
  senderNumber?: string;
  recipientNumber?: string;
  senderType: 'customer' | 'bot' | 'agent';
  messageType?: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}): Promise<Message> {
  const {
    conversationId,
    wabaId,
    phoneNumberId,
    messageId,
    senderNumber,
    recipientNumber,
    senderType,
    messageType = 'text',
    body,
    direction,
    status = 'sent',
  } = params;

  const res = await pool.query(
    `INSERT INTO messages 
      (conversation_id, waba_id, phone_number_id, message_id, sender_number, recipient_number, sender_type, message_type, body, direction, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (message_id) DO UPDATE 
     SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      conversationId,
      wabaId || null,
      phoneNumberId || null,
      messageId || null,
      senderNumber || null,
      recipientNumber || null,
      senderType,
      messageType,
      body,
      direction,
      status,
    ]
  );

  await pool.query(
    `UPDATE conversations 
     SET last_message_text = $1, 
         last_message_at = CURRENT_TIMESTAMP, 
         unread_count = CASE WHEN $2 = 'inbound' THEN unread_count + 1 ELSE 0 END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [body, direction, conversationId]
  );

  return res.rows[0];
}

export async function updateMessageStatus(messageId: string, status: string) {
  return pool.query(
    `UPDATE messages SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE message_id = $2`,
    [status, messageId]
  );
}

export async function getConversationsForUser(userId: string) {
  const res = await pool.query(
    `SELECT * FROM conversations WHERE user_id = $1 ORDER BY last_message_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getMessagesForConversation(conversationId: number, userId: string) {
  const check = await pool.query(
    `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (check.rows.length === 0) {
    return [];
  }

  const res = await pool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );

  return res.rows;
}

export async function updateConversationAIState(
  conversationId: number,
  state: Partial<ConversationAIState>
): Promise<ConversationAIState> {
  const res = await pool.query(
    `UPDATE conversations 
     SET ai_state = ai_state || $1::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING ai_state`,
    [JSON.stringify(state), conversationId]
  );
  return res.rows[0]?.ai_state;
}
