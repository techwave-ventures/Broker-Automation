import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.POSTGRES_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function checkDatabase() {
  const result = await pool.query('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
