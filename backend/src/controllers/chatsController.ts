import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { jsonError } from './http.js';
import { pool } from '../lib/db.js';
import { enqueueJob } from '../lib/queue.js';
import { z } from 'zod';
import { saveMessage, findOrCreateConversation } from '../models/conversationModel.js';

const chatUpdateSchema = z.object({
  customerName: z.string().optional(),
  status: z.enum(['bot_active', 'human_takeover']).optional(),
  unread_count: z.number().optional(),
  requirement: z.string().optional(),
  budget: z.string().optional(),
  property_id: z.string().optional()
});

const messageSendSchema = z.object({
  text: z.string().min(1)
});

export async function getChats(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.user_id || req.auth?.sub || 'local-dev';
    const email = req.auth?.email;

    const conversationsRes = await pool.query(
      `SELECT * FROM conversations 
       WHERE user_id = $1 OR user_id = $2 
       ORDER BY last_message_at DESC`,
      [userId, email || userId]
    );

    const conversations = conversationsRes.rows;

    const chatsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const msgRes = await pool.query(
          `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
          [conv.id]
        );

        const messages = msgRes.rows.map((m) => ({
          id: String(m.id || m.message_id),
          text: m.body || '',
          sender: m.sender_type === 'customer' ? 'user' : m.sender_type === 'agent' ? 'agent' : 'bot',
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        const lastTime = conv.last_message_at
          ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Just now';

        return {
          id: String(conv.id),
          user: {
            name: conv.customer_name || `Customer (${conv.customer_phone})`,
            phone: conv.customer_phone,
          },
          lastMessage: conv.last_message_text || '',
          lastMessageTime: lastTime,
          unread: conv.unread_count || 0,
          status: conv.status || 'bot_active',
          messages,
          leadContext: {
            requirement: 'Property Enquiry',
            budget: 'N/A',
            propertyId: '',
            propertyTitle: '',
          },
        };
      })
    );

    return res.json(chatsWithMessages);
  } catch (error) {
    console.error('Failed to get chats:', error);
    return jsonError(res, 500, 'Failed to get chats');
  }
}

export async function getChat(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const userId = req.auth?.user_id || req.auth?.sub || 'local-dev';
    const email = req.auth?.email;

    const convRes = await pool.query(
      `SELECT * FROM conversations WHERE id = $1 AND (user_id = $2 OR user_id = $3)`,
      [id, userId, email || userId]
    );

    const conv = convRes.rows[0];
    if (!conv) {
      return jsonError(res, 404, 'Conversation not found');
    }

    const msgRes = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conv.id]
    );

    const messages = msgRes.rows.map((m) => ({
      id: String(m.id || m.message_id),
      text: m.body || '',
      sender: m.sender_type === 'customer' ? 'user' : m.sender_type === 'agent' ? 'agent' : 'bot',
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return res.json({
      id: String(conv.id),
      user: {
        name: conv.customer_name || `Customer (${conv.customer_phone})`,
        phone: conv.customer_phone,
      },
      lastMessage: conv.last_message_text || '',
      lastMessageTime: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      unread: conv.unread_count || 0,
      status: conv.status || 'bot_active',
      messages,
      leadContext: {
        requirement: 'Property Enquiry',
        budget: 'N/A',
        propertyId: '',
        propertyTitle: '',
      },
    });
  } catch (error) {
    console.error('Failed to get chat:', error);
    return jsonError(res, 500, 'Failed to get chat');
  }
}

export async function updateChat(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const userId = req.auth?.user_id || req.auth?.sub || 'local-dev';
    const email = req.auth?.email;

    const parsed = chatUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (parsed.data.status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(parsed.data.status);
    }
    if (parsed.data.customerName) {
      updates.push(`customer_name = $${paramIndex++}`);
      values.push(parsed.data.customerName);
    }
    if (typeof parsed.data.unread_count === 'number') {
      updates.push(`unread_count = $${paramIndex++}`);
      values.push(parsed.data.unread_count);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId, email || userId);

    const query = `
      UPDATE conversations 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex++} AND (user_id = $${paramIndex++} OR user_id = $${paramIndex++})
      RETURNING *`;

    const result = await pool.query(query, values);
    return res.json(result.rows[0] || { success: true });
  } catch (error) {
    console.error('Failed to update chat:', error);
    return jsonError(res, 500, 'Failed to update chat');
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  return getChat(req, res);
}

export async function postChatMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const userId = req.auth?.user_id || req.auth?.sub || 'local-dev';
    const email = req.auth?.email;

    const parsed = messageSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const convRes = await pool.query(
      `SELECT * FROM conversations WHERE id = $1 AND (user_id = $2 OR user_id = $3)`,
      [id, userId, email || userId]
    );

    const conv = convRes.rows[0];
    if (!conv) {
      return jsonError(res, 404, 'Conversation not found');
    }

    // Save outbound message to DB
    const savedMsg = await saveMessage({
      conversationId: Number(conv.id),
      senderType: 'agent',
      direction: 'outbound',
      body: parsed.data.text,
      status: 'sent',
    });

    // Check if user has WABA & phone configured for live WhatsApp dispatch
    let wabaRes = await pool.query(
      'SELECT waba_id, access_token FROM wabas WHERE user_id = $1 OR user_id = $2 LIMIT 1',
      [userId, email || userId]
    );
    let wabaId = wabaRes.rows[0]?.waba_id;
    let accessToken = wabaRes.rows[0]?.access_token;

    if (!wabaId || !accessToken) {
      wabaRes = await pool.query(
        'SELECT waba_id, access_token FROM wabas WHERE user_id = $1 LIMIT 1',
        [conv.user_id]
      );
      wabaId = wabaRes.rows[0]?.waba_id;
      accessToken = wabaRes.rows[0]?.access_token;
    }
    if (!wabaId || !accessToken) {
      wabaRes = await pool.query('SELECT waba_id, access_token FROM wabas ORDER BY last_updated DESC LIMIT 1');
      wabaId = wabaRes.rows[0]?.waba_id;
      accessToken = wabaRes.rows[0]?.access_token;
    }

    let phoneRes = await pool.query(
      'SELECT phone_id FROM phones WHERE user_id = $1 OR user_id = $2 LIMIT 1',
      [userId, email || userId]
    );
    let phoneNumberId = phoneRes.rows[0]?.phone_id;

    if (!phoneNumberId) {
      phoneRes = await pool.query('SELECT phone_id FROM phones WHERE user_id = $1 LIMIT 1', [conv.user_id]);
      phoneNumberId = phoneRes.rows[0]?.phone_id;
    }
    if (!phoneNumberId) {
      phoneRes = await pool.query('SELECT phone_id FROM phones LIMIT 1');
      phoneNumberId = phoneRes.rows[0]?.phone_id;
    }

    if (wabaId && accessToken && phoneNumberId) {
      try {
        await enqueueJob('whatsapp_send', {
          phoneNumberId,
          accessToken,
          destPhone: conv.customer_phone,
          messageContent: parsed.data.text,
          wabaId,
        });
      } catch (err) {
        console.error('Failed to enqueue WhatsApp send job, attempting direct send:', err);
        try {
          const { send } = await import('../services/business.js');
          const apiRes = await send(phoneNumberId, accessToken, conv.customer_phone, parsed.data.text);
          if (apiRes?.error) {
            console.error('Meta Graph API direct send error:', apiRes.error);
          }
        } catch (directErr) {
          console.error('Direct WhatsApp send failed:', directErr);
        }
      }
    } else {
      console.warn(`[postChatMessage] Unable to send WhatsApp message: Missing WABA or Phone configuration (wabaId=${wabaId}, phoneId=${phoneNumberId})`);
    }

    return res.status(201).json({
      id: String(savedMsg.id),
      text: savedMsg.body,
      sender: 'agent',
      time: new Date(savedMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return jsonError(res, 500, 'Failed to send chat message');
  }
}
