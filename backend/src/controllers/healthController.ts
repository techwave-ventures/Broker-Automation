import type { Request, Response } from 'express';
import { checkDatabase } from '../lib/db.js';

export async function getHealth(_req: Request, res: Response) {
  try {
    const database = await checkDatabase();
    return res.json({ ok: true, database });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ ok: false, database: false });
  }
}
