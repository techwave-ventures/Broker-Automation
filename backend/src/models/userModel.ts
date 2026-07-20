import { pool } from '../lib/db.js';

export interface User {
  key?: number;
  user_id: string;
  email: string;
  password_hash: string;
  name?: string | null;
  avatar?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export async function createUser(data: {
  user_id: string;
  email: string;
  password_hash: string;
  name?: string;
  avatar?: string;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (user_id, email, password_hash, name, avatar)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.user_id, data.email.toLowerCase().trim(), data.password_hash, data.name || null, data.avatar || null]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

export async function findUserById(user_id: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE user_id = $1 LIMIT 1`,
    [user_id]
  );
  return result.rows[0] || null;
}
