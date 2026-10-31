export interface QueuedRequest {
  execute: () => Promise<void>;
}

/**
 * Serializes requests sharing a Discord rate-limit bucket. Each bucket
 * processes one request at a time and self-throttles based on the
 * X-RateLimit-Remaining/Reset-After headers returned by Discord, so callers
 * never need to pre-compute limits themselves.
 */
export class Bucket {
  public readonly id: string;
  private queue: QueuedRequest[] = [];
  private running = false;
  private remaining = 1;
  private resetAt = 0;

  constructor(id: string) {
    this.id = id;
  }

  public enqueue(execute: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: () => execute().then(resolve, reject),
      });
      void this.process();
    });
  }

  public updateFromHeaders(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const resetAfter = headers.get("x-ratelimit-reset-after");
    if (remaining !== null) this.remaining = Number(remaining);
    if (resetAfter !== null) this.resetAt = Date.now() + Number(resetAfter) * 1000;
  }

  /** Forces the bucket to wait out an explicit retry-after (429 responses). */
  public lockFor(ms: number): void {
    this.remaining = 0;
    this.resetAt = Date.now() + ms;
  }

  private async process(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        if (this.remaining <= 0 && this.resetAt > Date.now()) {
          await delay(this.resetAt - Date.now());
        }
        const item = this.queue.shift()!;
        await item.execute();
      }
    } finally {
      this.running = false;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}
