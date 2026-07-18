import type { Response } from 'express';
import { createAblyTokenRequest } from '../lib/ably.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function getAblyAuth(req: AuthenticatedRequest, res: Response) {
  try {
    const clientId = req.auth?.email;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing user email' });
    }

    const tokenRequest = await createAblyTokenRequest(clientId);
    return res.json(tokenRequest);
  } catch (error) {
    console.error('Failed to create Ably token:', error);
    return res.status(500).json({ error: 'Failed to create Ably token' });
  }
}
