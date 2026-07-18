import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export function getMe(req: AuthenticatedRequest, res: Response) {
  return res.json({ user: req.auth ?? null });
}
