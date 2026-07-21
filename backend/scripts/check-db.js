import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: POSTGRES_URL is missing in environment variables (.env).');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    console.log('================================================================');
    console.log('📊 DATABASE SNAPSHOT');
    console.log('================================================================\n');

    console.log('--- USERS ---');
    const users = await pool.query("SELECT key, user_id, email, name, created_at FROM users");
    console.table(users.rows);

    console.log('\n--- WABAS (WhatsApp Business Accounts) ---');
    const wabas = await pool.query("SELECT key, waba_id, user_id, app_id, business_id, last_updated FROM wabas");
    console.table(wabas.rows);

    console.log('\n--- PHONES ---');
    const phones = await pool.query("SELECT key, phone_id, user_id, is_ack_bot_enabled, last_updated FROM phones");
    console.table(phones.rows);

    console.log('\n--- CONVERSATIONS ---');
    const convs = await pool.query("SELECT id, user_id, customer_phone, customer_name, business_phone, status, last_message_text, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 5");
    console.table(convs.rows);

    console.log('\n--- MESSAGES ---');
    const msgs = await pool.query("SELECT id, conversation_id, phone_number_id, sender_type, direction, status, body, created_at FROM messages ORDER BY created_at DESC LIMIT 10");
    console.table(msgs.rows);

    console.log('\n--- RECENT MESSAGING EVENTS (Webhooks) ---');
    const events = await pool.query("SELECT id, waba_id, phone_number_id, event_type, created_at FROM messaging_events ORDER BY created_at DESC LIMIT 5");
    console.table(events.rows);

  } catch (err) {
    console.error('Query Error:', err);
  } finally {
    await pool.end();
  }
}

check();
