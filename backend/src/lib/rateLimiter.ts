import { redisConnection } from './redis.js';

// Default Vertex AI Gemini 2.5 Flash standard tier limit configurations
const DEFAULT_MAX_RPM = 1000;
const DEFAULT_MAX_TPM = 300000; // Conservative safety limit for 1M standard limit

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // standard heuristic: 1 token ~ 3.8 characters for English
  return Math.ceil(text.length / 3.8);
}

export interface RateLimitResult {
  allowed: boolean;
  currentRequests: number;
  currentTokens: number;
  retryAfterMs: number;
}

/**
 * Checks and consumes tokens from the sliding window token bucket.
 * Tracks both RPM and TPM within a single sliding window.
 */
export async function checkAndConsumeTokens(
  key: string,
  tokensRequested: number,
  maxRpm: number = DEFAULT_MAX_RPM,
  maxTpm: number = DEFAULT_MAX_TPM
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = 60000; // 1 minute sliding window
  const clearBefore = now - windowMs;

  const redisKey = `ratelimit:${key}`;

  // 1. Remove elements outside the current window
  await redisConnection.zremrangebyscore(redisKey, 0, clearBefore);

  // 2. Fetch all elements within the window
  const elements = await redisConnection.zrangebyscore(redisKey, clearBefore, '+inf');

  let currentRequests = 0;
  let currentTokens = 0;

  // Track oldest element timestamp to calculate exact retry interval
  let oldestTimestamp = now;

  for (const element of elements) {
    // Member format: "tokens:timestamp:random"
    const parts = element.split(':');
    if (parts.length >= 2) {
      const tokens = parseInt(parts[0], 10);
      const timestamp = parseInt(parts[1], 10);
      if (!isNaN(tokens) && !isNaN(timestamp)) {
        currentRequests++;
        currentTokens += tokens;
        if (timestamp < oldestTimestamp) {
          oldestTimestamp = timestamp;
        }
      }
    }
  }

  // Check limits
  const isRequestLimitBreached = currentRequests + 1 > maxRpm;
  const isTokenLimitBreached = currentTokens + tokensRequested > maxTpm;

  if (isRequestLimitBreached || isTokenLimitBreached) {
    // Calculate backoff time based on the oldest request in the window sliding out
    const timeElapsedSinceOldest = now - oldestTimestamp;
    const retryAfterMs = Math.max(0, windowMs - timeElapsedSinceOldest);

    return {
      allowed: false,
      currentRequests,
      currentTokens,
      retryAfterMs: retryAfterMs || 1000, // minimum 1s wait
    };
  }

  // Add the new request/token usage to the window
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const member = `${tokensRequested}:${now}:${randomSuffix}`;
  await redisConnection.zadd(redisKey, now, member);

  // Set TTL on key to avoid leaking space if idle
  await redisConnection.expire(redisKey, 120);

  return {
    allowed: true,
    currentRequests: currentRequests + 1,
    currentTokens: currentTokens + tokensRequested,
    retryAfterMs: 0,
  };
}

class RateLimiter {
  private queue: (() => void)[] = [];
  private activeCount = 0;
  private maxConcurrent = 10;
  private minIntervalMs = 50;

  async limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.activeCount >= this.maxConcurrent) return;

    this.activeCount++;
    const next = this.queue.shift()!;

    (async () => {
      try {
        await next();
      } catch (err) {
        // Promise rejection is handled by the caller
      } finally {
        this.activeCount--;
        setTimeout(() => this.processQueue(), this.minIntervalMs);
      }
    })();
  }
}

export const metaRateLimiter = new RateLimiter();
