import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { pool } from '../lib/db.js';
import { jsonError, parseBody, validationMessage } from './http.js';
import { phoneConfigSchema, type PhoneConfigInput } from '../modules/schemas.js';

export async function getPhoneConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const phoneId = String(req.query.phoneId ?? '');
    if (!phoneId) {
      return jsonError(res, 400, 'phoneId is required');
    }

    const userId = req.auth?.email;
    const result = userId
      ? await pool.query('select ack_bot_message from phones where phone_id = $1 and user_id = $2', [phoneId, userId])
      : await pool.query('select ack_bot_message from phones where phone_id = $1', [phoneId]);

    return res.json({ ackBotMessage: result.rows[0]?.ack_bot_message ?? '' });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to get phone config:', error);
    return jsonError(res, 500, 'Failed to get phone config');
  }
}

export async function postPhoneConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const body = parseBody<PhoneConfigInput>(phoneConfigSchema, req.body);
    const userId = req.auth?.email;

    if (!userId) {
      return jsonError(res, 401, 'Missing user email in session');
    }

    if (body.ackBotMessage !== undefined) {
      await pool.query(
        `insert into phones (phone_id, is_ack_bot_enabled, ack_bot_message, user_id)
         values ($1, $2, $3, $4)
         on conflict (phone_id)
         do update set is_ack_bot_enabled = excluded.is_ack_bot_enabled, ack_bot_message = excluded.ack_bot_message, user_id = excluded.user_id`,
        [body.phoneId, body.isAckBotEnabled, body.ackBotMessage, userId],
      );
    } else {
      await pool.query(
        `insert into phones (phone_id, is_ack_bot_enabled, user_id)
         values ($1, $2, $3)
         on conflict (phone_id)
         do update set is_ack_bot_enabled = excluded.is_ack_bot_enabled, user_id = excluded.user_id`,
        [body.phoneId, body.isAckBotEnabled, userId],
      );
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    const validationError = validationMessage(error);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }
    console.error('Failed to update ack bot status:', error);
    return jsonError(res, 500, 'Failed to update ack bot status');
  }
}
