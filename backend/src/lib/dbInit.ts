import { pool } from './db.js';

export async function initDatabase() {
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      waba_id VARCHAR(100),
      phone_number_id VARCHAR(100),
      message_id VARCHAR(100) UNIQUE,
      sender_number VARCHAR(50),
      recipient_number VARCHAR(50),
      message_type VARCHAR(20),
      body TEXT,
      direction VARCHAR(10), -- 'inbound' or 'outbound'
      status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS messaging_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      waba_id VARCHAR(100),
      phone_number_id VARCHAR(100),
      event_type VARCHAR(50), -- 'call_event', 'call_status', 'message_status', etc.
      event_id VARCHAR(100),
      payload JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `
  ];

  for (const query of queries) {
    await pool.query(query);
  }
}
