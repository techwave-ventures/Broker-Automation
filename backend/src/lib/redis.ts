import { Redis } from 'ioredis';
import { env } from '../config/env.js';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 3) return null; // Stop infinite reconnect loop if Redis service is offline
    return Math.min(times * 200, 1000);
  },
  tls: isTls ? { rejectUnauthorized: false } : undefined,
});

redisConnection.on('error', (err) => {
  console.warn('⚠️ [REDIS WARNING] Connection alert:', err.message);
});
