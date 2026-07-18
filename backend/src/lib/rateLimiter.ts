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
