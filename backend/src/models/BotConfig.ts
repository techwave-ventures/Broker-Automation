import { pool } from '../lib/db.js';

export interface BotConfig {
  key?: string; // stored as bigint in DB, serialized as string in API
  phone_id: string;
  user_id: string;
  is_auto_reply_enabled: boolean;
  bot_language: string;
  send_property_links: boolean;
  is_auto_follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  bot_tone: string;
  notify_new_lead: boolean;
  notify_appointment: boolean;
  notify_weekly_report: boolean;
  auto_qualify: boolean;
  schedule_viewings: boolean;
  property_recommend: boolean;
  multilingual: boolean;
  bot_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getBotConfigByPhone(phoneId: string): Promise<BotConfig | null> {
  const result = await pool.query('SELECT * FROM bot_configs WHERE phone_id = $1', [phoneId]);
  if (result.rows.length === 0) return null;
  return mapRowToBotConfig(result.rows[0]);
}

export async function getBotConfigByUser(userId: string): Promise<BotConfig[]> {
  const result = await pool.query('SELECT * FROM bot_configs WHERE user_id = $1', [userId]);
  return result.rows.map(row => mapRowToBotConfig(row));
}

export async function upsertBotConfig(
  config: Partial<Omit<BotConfig, 'key' | 'phone_id' | 'user_id' | 'created_at' | 'updated_at'>>,
  phoneId: string,
  userId: string
): Promise<BotConfig> {
  const current = await getBotConfigByPhone(phoneId);

  if (!current) {
    // Insert new config with defaults merged with custom values
    const query = `
      INSERT INTO bot_configs (
        phone_id, user_id, is_auto_reply_enabled, bot_language, send_property_links,
        is_auto_follow_up_enabled, follow_up_delay_hours, bot_tone,
        notify_new_lead, notify_appointment, notify_weekly_report,
        auto_qualify, schedule_viewings, property_recommend, multilingual,
        bot_instructions
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;
    const values = [
      phoneId,
      userId,
      config.is_auto_reply_enabled !== undefined ? config.is_auto_reply_enabled : true,
      config.bot_language || 'English',
      config.send_property_links !== undefined ? config.send_property_links : true,
      config.is_auto_follow_up_enabled !== undefined ? config.is_auto_follow_up_enabled : true,
      config.follow_up_delay_hours !== undefined ? config.follow_up_delay_hours : 24,
      config.bot_tone || 'Professional',
      config.notify_new_lead !== undefined ? config.notify_new_lead : true,
      config.notify_appointment !== undefined ? config.notify_appointment : true,
      config.notify_weekly_report !== undefined ? config.notify_weekly_report : false,
      config.auto_qualify !== undefined ? config.auto_qualify : true,
      config.schedule_viewings !== undefined ? config.schedule_viewings : true,
      config.property_recommend !== undefined ? config.property_recommend : true,
      config.multilingual !== undefined ? config.multilingual : false,
      config.bot_instructions || 'You are PropBot, a helpful real estate assistant for Sunrise Realty. Help buyers find the right property by understanding their budget, location, and requirements. Be polite, professional, and respond in the same language the user writes in. Always try to schedule a site visit after gathering the buyer\'s requirements.'
    ];
    const result = await pool.query(query, values);
    return mapRowToBotConfig(result.rows[0]);
  } else {
    // Update existing config
    const query = `
      UPDATE bot_configs SET
        is_auto_reply_enabled = COALESCE($1, is_auto_reply_enabled),
        bot_language = COALESCE($2, bot_language),
        send_property_links = COALESCE($3, send_property_links),
        is_auto_follow_up_enabled = COALESCE($4, is_auto_follow_up_enabled),
        follow_up_delay_hours = COALESCE($5, follow_up_delay_hours),
        bot_tone = COALESCE($6, bot_tone),
        notify_new_lead = COALESCE($7, notify_new_lead),
        notify_appointment = COALESCE($8, notify_appointment),
        notify_weekly_report = COALESCE($9, notify_weekly_report),
        auto_qualify = COALESCE($10, auto_qualify),
        schedule_viewings = COALESCE($11, schedule_viewings),
        property_recommend = COALESCE($12, property_recommend),
        multilingual = COALESCE($13, multilingual),
        bot_instructions = COALESCE($14, bot_instructions),
        updated_at = CURRENT_TIMESTAMP
      WHERE phone_id = $15 AND user_id = $16
      RETURNING *
    `;
    const values = [
      config.is_auto_reply_enabled !== undefined ? config.is_auto_reply_enabled : null,
      config.bot_language !== undefined ? config.bot_language : null,
      config.send_property_links !== undefined ? config.send_property_links : null,
      config.is_auto_follow_up_enabled !== undefined ? config.is_auto_follow_up_enabled : null,
      config.follow_up_delay_hours !== undefined ? config.follow_up_delay_hours : null,
      config.bot_tone !== undefined ? config.bot_tone : null,
      config.notify_new_lead !== undefined ? config.notify_new_lead : null,
      config.notify_appointment !== undefined ? config.notify_appointment : null,
      config.notify_weekly_report !== undefined ? config.notify_weekly_report : null,
      config.auto_qualify !== undefined ? config.auto_qualify : null,
      config.schedule_viewings !== undefined ? config.schedule_viewings : null,
      config.property_recommend !== undefined ? config.property_recommend : null,
      config.multilingual !== undefined ? config.multilingual : null,
      config.bot_instructions !== undefined ? config.bot_instructions : null,
      phoneId,
      userId
    ];
    const result = await pool.query(query, values);
    return mapRowToBotConfig(result.rows[0]);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToBotConfig(row: any): BotConfig {
  return {
    key: String(row.key),
    phone_id: row.phone_id,
    user_id: row.user_id,
    is_auto_reply_enabled: !!row.is_auto_reply_enabled,
    bot_language: row.bot_language,
    send_property_links: !!row.send_property_links,
    is_auto_follow_up_enabled: !!row.is_auto_follow_up_enabled,
    follow_up_delay_hours: Number(row.follow_up_delay_hours),
    bot_tone: row.bot_tone,
    notify_new_lead: !!row.notify_new_lead,
    notify_appointment: !!row.notify_appointment,
    notify_weekly_report: !!row.notify_weekly_report,
    auto_qualify: !!row.auto_qualify,
    schedule_viewings: !!row.schedule_viewings,
    property_recommend: !!row.property_recommend,
    multilingual: !!row.multilingual,
    bot_instructions: row.bot_instructions,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
