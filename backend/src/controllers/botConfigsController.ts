import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import * as BotConfigModel from '../models/BotConfig.js';
import { jsonError } from './http.js';
import { pool } from '../lib/db.js';
import { z } from 'zod';

const botConfigSchema = z.object({
  is_auto_reply_enabled: z.boolean().optional(),
  bot_language: z.string().optional(),
  send_property_links: z.boolean().optional(),
  is_auto_follow_up_enabled: z.boolean().optional(),
  follow_up_delay_hours: z.number().optional(),
  bot_tone: z.string().optional(),
  notify_new_lead: z.boolean().optional(),
  notify_appointment: z.boolean().optional(),
  notify_weekly_report: z.boolean().optional(),
  auto_qualify: z.boolean().optional(),
  schedule_viewings: z.boolean().optional(),
  property_recommend: z.boolean().optional(),
  multilingual: z.boolean().optional()
});

export async function getBotConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    // Resolve active phone number connected to this user
    const phoneResult = await pool.query(
      'SELECT phone_id FROM phones WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const phoneId = phoneResult.rows[0]?.phone_id || 'mock-phone-id';

    let config = await BotConfigModel.getBotConfigByPhone(phoneId);
    if (!config) {
      // Create initial default config
      config = await BotConfigModel.upsertBotConfig({}, phoneId, userId);
    }

    return res.json(config);
  } catch (error) {
    console.error('Failed to get bot config:', error);
    return jsonError(res, 500, 'Failed to get bot config');
  }
}

export async function postBotConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.auth?.email;
    if (!userId) {
      return jsonError(res, 401, 'Unauthorized');
    }

    const parsed = botConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return jsonError(res, 400, parsed.error.issues[0]?.message || 'Invalid payload');
    }

    // Resolve active phone number connected to this user
    const phoneResult = await pool.query(
      'SELECT phone_id FROM phones WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const phoneId = phoneResult.rows[0]?.phone_id || 'mock-phone-id';

    const updated = await BotConfigModel.upsertBotConfig(parsed.data, phoneId, userId);
    return res.json(updated);
  } catch (error) {
    console.error('Failed to update bot config:', error);
    return jsonError(res, 500, 'Failed to update bot config');
  }
}
