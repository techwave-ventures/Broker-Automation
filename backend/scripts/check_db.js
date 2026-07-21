import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pkg;
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: POSTGRES_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('=== USERS ===');
    const users = await pool.query('SELECT user_id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10');
    console.table(users.rows);

    console.log('\n=== WABAS ===');
    const wabas = await pool.query('SELECT waba_id, user_id, business_id, last_updated FROM wabas LIMIT 10');
    console.table(wabas.rows);

    console.log('\n=== PHONES ===');
    const phones = await pool.query('SELECT phone_id, user_id, is_ack_bot_enabled FROM phones LIMIT 10');
    console.table(phones.rows);

    console.log('\n=== CONVERSATIONS ===');
    const convs = await pool.query('SELECT id, user_id, customer_phone, customer_name, status, last_message_text, last_message_at FROM conversations ORDER BY last_message_at DESC LIMIT 20');
    console.table(convs.rows);

    console.log('\n=== MESSAGES ===');
    const msgs = await pool.query('SELECT id, conversation_id, sender_type, body, created_at FROM messages ORDER BY created_at DESC LIMIT 20');
    console.table(msgs.rows);

  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await pool.end();
  }
}

run();
