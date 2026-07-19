import { pool } from '../lib/db.js';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent';
  time: string;
}

export interface ChatModel {
  key?: string; // stored as bigint in DB, serialized as string in API
  user_id: string;
  phone_number_id?: string;
  customer_name?: string;
  customer_phone: string;
  avatar?: string;
  status: 'bot_active' | 'human_takeover';
  unread_count: number;
  last_message_text?: string;
  last_message_time?: string;
  requirement?: string;
  budget?: string;
  property_id?: string;
  property_title?: string | null; // dynamic join
  created_at?: string;
  updated_at?: string;
}

export async function getChatsByUser(userId: string): Promise<ChatModel[]> {
  const query = `
    SELECT c.*, p.title as property_title
    FROM chats c
    LEFT JOIN properties p ON c.property_id = p.key
    WHERE c.user_id = $1
    ORDER BY c.last_message_time DESC NULLS LAST, c.updated_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map(row => mapRowToChat(row));
}

export async function getChatByKey(key: string | number): Promise<ChatModel | null> {
  const query = `
    SELECT c.*, p.title as property_title
    FROM chats c
    LEFT JOIN properties p ON c.property_id = p.key
    WHERE c.key = $1
  `;
  const result = await pool.query(query, [key]);
  if (result.rows.length === 0) return null;
  return mapRowToChat(result.rows[0]);
}

export async function getChatByCustomer(userId: string, customerPhone: string): Promise<ChatModel | null> {
  const query = `
    SELECT c.*, p.title as property_title
    FROM chats c
    LEFT JOIN properties p ON c.property_id = p.key
    WHERE c.user_id = $1 AND c.customer_phone = $2
  `;
  const result = await pool.query(query, [userId, customerPhone]);
  if (result.rows.length === 0) return null;
  return mapRowToChat(result.rows[0]);
}

export async function createChat(
  chat: Omit<ChatModel, 'key' | 'user_id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<ChatModel> {
  const query = `
    INSERT INTO chats (
      user_id, phone_number_id, customer_name, customer_phone, avatar,
      status, unread_count, last_message_text, last_message_time,
      requirement, budget, property_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING *
  `;
  const values = [
    userId,
    chat.phone_number_id || null,
    chat.customer_name || null,
    chat.customer_phone,
    chat.avatar || null,
    chat.status || 'bot_active',
    chat.unread_count || 0,
    chat.last_message_text || null,
    chat.last_message_time ? new Date(chat.last_message_time) : null,
    chat.requirement || null,
    chat.budget || null,
    chat.property_id ? Number(chat.property_id) : null
  ];

  const result = await pool.query(query, values);
  return getChatByKey(result.rows[0].key) as Promise<ChatModel>;
}

export async function updateChat(
  key: string | number,
  chat: Partial<ChatModel>,
  userId: string
): Promise<ChatModel | null> {
  const query = `
    UPDATE chats SET
      customer_name = COALESCE($1, customer_name),
      phone_number_id = COALESCE($2, phone_number_id),
      avatar = COALESCE($3, avatar),
      status = COALESCE($4, status),
      unread_count = COALESCE($5, unread_count),
      last_message_text = COALESCE($6, last_message_text),
      last_message_time = COALESCE($7, last_message_time),
      requirement = COALESCE($8, requirement),
      budget = COALESCE($9, budget),
      property_id = CASE WHEN $10 = -1 THEN NULL WHEN $10 IS NOT NULL THEN $10 ELSE property_id END,
      updated_at = CURRENT_TIMESTAMP
    WHERE key = $11 AND user_id = $12
    RETURNING *
  `;

  const propertyIdVal = chat.property_id === '' ? -1 : (chat.property_id ? Number(chat.property_id) : null);

  const values = [
    chat.customer_name !== undefined ? chat.customer_name : null,
    chat.phone_number_id !== undefined ? chat.phone_number_id : null,
    chat.avatar !== undefined ? chat.avatar : null,
    chat.status !== undefined ? chat.status : null,
    chat.unread_count !== undefined ? chat.unread_count : null,
    chat.last_message_text !== undefined ? chat.last_message_text : null,
    chat.last_message_time ? new Date(chat.last_message_time) : null,
    chat.requirement !== undefined ? chat.requirement : null,
    chat.budget !== undefined ? chat.budget : null,
    propertyIdVal,
    key,
    userId
  ];

  const result = await pool.query(query, values);
  if (result.rows.length === 0) return null;
  return getChatByKey(result.rows[0].key);
}

export async function getChatMessages(customerPhone: string): Promise<Message[]> {
  const query = `
    SELECT id, body, direction, sender_type, created_at
    FROM messages
    WHERE sender_number = $1 OR recipient_number = $1
    ORDER BY created_at ASC
  `;
  const result = await pool.query(query, [customerPhone]);
  return result.rows.map(row => {
    // Map database message details to frontend structure
    let sender: 'user' | 'bot' | 'agent' = 'user';
    if (row.direction === 'outbound') {
      sender = row.sender_type === 'agent' ? 'agent' : 'bot';
    }
    return {
      id: String(row.id),
      text: row.body || '',
      sender,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  });
}

export async function addChatMessage(
  customerPhone: string,
  phoneNumberId: string,
  text: string,
  direction: 'inbound' | 'outbound',
  senderType: 'user' | 'bot' | 'agent',
  wabaId?: string
): Promise<Message> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const senderNumber = direction === 'inbound' ? customerPhone : phoneNumberId;
  const recipientNumber = direction === 'inbound' ? phoneNumberId : customerPhone;

  const query = `
    INSERT INTO messages (waba_id, phone_number_id, message_id, sender_number, recipient_number, message_type, body, direction, status, sender_type)
    VALUES ($1, $2, $3, $4, $5, 'text', $6, $7, 'delivered', $8)
    RETURNING id, created_at
  `;
  const result = await pool.query(query, [
    wabaId || null,
    phoneNumberId,
    messageId,
    senderNumber,
    recipientNumber,
    text,
    direction,
    senderType
  ]);

  return {
    id: String(result.rows[0].id),
    text,
    sender: senderType,
    time: new Date(result.rows[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToChat(row: any): ChatModel {
  return {
    key: String(row.key),
    user_id: row.user_id,
    phone_number_id: row.phone_number_id || undefined,
    customer_name: row.customer_name || undefined,
    customer_phone: row.customer_phone,
    avatar: row.avatar || undefined,
    status: row.status,
    unread_count: Number(row.unread_count || 0),
    last_message_text: row.last_message_text || undefined,
    last_message_time: row.last_message_time ? new Date(row.last_message_time).toISOString() : undefined,
    requirement: row.requirement || undefined,
    budget: row.budget || undefined,
    property_id: row.property_id ? String(row.property_id) : undefined,
    property_title: row.property_title || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
