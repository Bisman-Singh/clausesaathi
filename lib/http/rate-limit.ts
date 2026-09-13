/**
 * Sliding-window rate limiter kept in process memory.
 *
 * Each serverless instance keeps its own window, which is enough to blunt a
 * single abusive client without any shared store. Documented as a known
 * limitation in SECURITY.md.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Record a hit and report whether the caller is still within the limit. */
  allow(key: string): boolean {
    const cutoff = this.now() - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(this.now());
    this.hits.set(key, recent);
    this.prune(cutoff);
    return true;
  }

  private prune(cutoff: number): void {
    if (this.hits.size < 1000) return;
    for (const [key, times] of this.hits) {
      if (times.every((at) => at <= cutoff)) this.hits.delete(key);
    }
  }
}

/** Ten AI-backed requests per minute per address. */
export const AI_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;
