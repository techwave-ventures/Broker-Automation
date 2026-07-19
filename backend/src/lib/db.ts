import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.POSTGRES_URL,
  ssl: env.POSTGRES_URL.includes('sslmode=require') || env.POSTGRES_URL.includes('neon.tech') || env.POSTGRES_URL.includes('render')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function checkDatabase() {
  const result = await pool.query('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
