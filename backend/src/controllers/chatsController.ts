import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as ChatModel from '../models/Chat.js';
import { jsonError } from './http.js';
import { pool } from '../lib/db.js';
import { enqueueJob } from '../lib/queue.js';
import { z } from 'zod';

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
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }
    const chats = await ChatModel.getChatsByUser(userId);
    return res.json(chats);
  } catch (error) {
    console.error('Failed to get chats:', error);
    return jsonError(res, 500, 'Failed to get chats');
  }
}

export async function getChat(req: AuthenticatedRequest, res: Response) {
  try {
    const key = String(req.params.id);
    const chat = await ChatModel.getChatByKey(key);
    if (!chat) {
      return jsonError(res, 404, 'Chat not found');
    }
    return res.json(chat);
  } catch (error) {
    console.error('Failed to get chat:', error);
    return jsonError(res, 500, 'Failed to get chat');
  }
}

export async function updateChat(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const parsed = chatUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    const updated = await ChatModel.updateChat(key, parsed.data, userId);
    if (!updated) {
      return jsonError(res, 404, 'Chat not found or unauthorized');
    }

    return res.json(updated);
  } catch (error) {
    console.error('Failed to update chat:', error);
    return jsonError(res, 500, 'Failed to update chat');
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const key = String(req.params.id);
    const chat = await ChatModel.getChatByKey(key);
    if (!chat) {
      return jsonError(res, 404, 'Chat not found');
    }

    const messages = await ChatModel.getChatMessages(chat.customer_phone);
    return res.json(messages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    return jsonError(res, 500, 'Failed to get messages');
  }
}

export async function postChatMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const key = String(req.params.id);
    const chat = await ChatModel.getChatByKey(key);
    if (!chat) {
      return jsonError(res, 404, 'Chat not found');
    }

    const parsed = messageSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    // Resolve WABA and Phone details to dispatch the WhatsApp message if available
    const wabaResult = await pool.query(
      'SELECT waba_id, access_token FROM wabas WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const wabaId = wabaResult.rows[0]?.waba_id;
    const accessToken = wabaResult.rows[0]?.access_token;
    
    // Resolve the active phone number id from the database
    const phoneResult = await pool.query(
      'SELECT phone_id FROM phones WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const phoneNumberId = chat.phone_number_id || phoneResult.rows[0]?.phone_id || 'mock-phone-id';

    // 1. Add message in the database
    const savedMessage = await ChatModel.addChatMessage(
      chat.customer_phone,
      phoneNumberId,
      parsed.data.text,
      'outbound',
      'agent',
      wabaId
    );

    // 2. Update the chat metadata
    await ChatModel.updateChat(key, {
      last_message_text: parsed.data.text,
      last_message_time: new Date().toISOString()
    }, userId);

    // 3. Dispatch to Meta WhatsApp API via queue if configurations exist
    if (wabaId && accessToken && phoneNumberId !== 'mock-phone-id') {
      try {
        await enqueueJob('whatsapp_send', {
          phoneNumberId,
          accessToken,
          destPhone: chat.customer_phone,
          messageContent: parsed.data.text,
          wabaId
        });
      } catch (err) {
        console.error('Failed to enqueue whatsapp dispatch job:', err);
      }
    }

    return res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return jsonError(res, 500, 'Failed to send chat message');
  }
}
