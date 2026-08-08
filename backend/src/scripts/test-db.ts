import { pool } from '../lib/db.js';

async function testConnection() {
  console.log('Testing DB connection...');
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful! Server time:', res.rows[0].now);
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message || err);
  } finally {
    await pool.end();
  }
}

testConnection();
