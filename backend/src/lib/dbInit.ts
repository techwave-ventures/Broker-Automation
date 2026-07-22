import { pool } from './db.js';

export async function initDatabase() {
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS users (
      key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255),
      avatar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
    `,
    `
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      business_phone VARCHAR(50),
      customer_phone VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255),
      status VARCHAR(20) DEFAULT 'bot_active',
      last_message_text TEXT,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unread_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, customer_phone)
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_user_customer ON conversations(user_id, customer_phone);
    `,
    `
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
      waba_id VARCHAR(100),
      phone_number_id VARCHAR(100),
      message_id VARCHAR(100) UNIQUE,
      sender_number VARCHAR(50),
      recipient_number VARCHAR(50),
      sender_type VARCHAR(20) DEFAULT 'customer',
      message_type VARCHAR(20) DEFAULT 'text',
      body TEXT,
      direction VARCHAR(10),
      status VARCHAR(20) DEFAULT 'sent',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'customer';
    `,
    `
    CREATE TABLE IF NOT EXISTS messaging_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      waba_id VARCHAR(100),
      phone_number_id VARCHAR(100),
      event_type VARCHAR(50),
      event_id VARCHAR(100),
      payload JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS properties (
      key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      transaction_type VARCHAR(10) CHECK (transaction_type IN ('Sell', 'Rent')),
      expected_price NUMERIC,
      negotiable BOOLEAN DEFAULT FALSE,
      monthly_rent NUMERIC,
      security_deposit NUMERIC,
      available_from DATE,
      category VARCHAR(50) CHECK (category IN ('Residential', 'Commercial', 'Land')),
      type VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      locality VARCHAR(100) NOT NULL,
      full_address TEXT NOT NULL,
      image TEXT,
      images JSONB DEFAULT '[]'::jsonb,
      built_up_area NUMERIC,
      plot_area NUMERIC,
      furnishing VARCHAR(50),
      parking VARCHAR(100),
      status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Sold', 'Rented', 'Hidden')),
      beds INTEGER,
      baths INTEGER,
      property_age VARCHAR(50),
      ready_to_move BOOLEAN DEFAULT TRUE,
      floor_number VARCHAR(20),
      total_floors VARCHAR(20),
      garden BOOLEAN DEFAULT FALSE,
      washrooms INTEGER,
      plot_width NUMERIC,
      plot_length NUMERIC,
      corner_plot BOOLEAN DEFAULT FALSE,
      amenities JSONB DEFAULT '[]'::jsonb,
      other_amenities JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS leads (
      key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      requested_locality VARCHAR(255),
      budget VARCHAR(100),
      other_reqs TEXT,
      interested_property_id BIGINT REFERENCES properties(key) ON DELETE SET NULL,
      appointment_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'Browsing (No Visit)' CHECK (status IN ('Upcoming Visit', 'Visited', 'Negotiating', 'Browsing (No Visit)', 'Closed')),
      lead_score VARCHAR(10) DEFAULT 'Low' CHECK (lead_score IN ('High', 'Medium', 'Low')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS bot_configs (
      key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      phone_id VARCHAR(100) UNIQUE NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      is_auto_reply_enabled BOOLEAN DEFAULT TRUE,
      bot_language VARCHAR(50) DEFAULT 'English',
      send_property_links BOOLEAN DEFAULT TRUE,
      is_auto_follow_up_enabled BOOLEAN DEFAULT TRUE,
      follow_up_delay_hours INTEGER DEFAULT 24,
      bot_tone VARCHAR(50) DEFAULT 'Professional',
      notify_new_lead BOOLEAN DEFAULT TRUE,
      notify_appointment BOOLEAN DEFAULT TRUE,
      notify_weekly_report BOOLEAN DEFAULT FALSE,
      auto_qualify BOOLEAN DEFAULT TRUE,
      schedule_viewings BOOLEAN DEFAULT TRUE,
      property_recommend BOOLEAN DEFAULT TRUE,
      multilingual BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    ALTER TABLE phones ADD COLUMN IF NOT EXISTS display_phone_number VARCHAR(100);
    `
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (err) {
      console.error('Table init query warning:', err);
    }
  }
}
