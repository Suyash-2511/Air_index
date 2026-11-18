/** Outcome of checking a client request against the rate limiter. */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetTimeMs: number;
}

interface WindowRecord {
  count: number;
  windowStart: number;
}

/**
 * Fixed-window rate limiter per client IP address.
 * Prevents API abuse and DoS attacks by bounding request bursts.
 */
export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly records = new Map<string, WindowRecord>();

  constructor(limit = 60, windowMs = 60000) {
    this.limit = Math.max(1, limit);
    this.windowMs = Math.max(1000, windowMs);
  }

  /**
   * Assesses whether an IP address is within permitted request thresholds.
   * Increments the request count or calculates retry-after penalty duration.
   */
  check(ip: string, now: number = Date.now()): RateLimitResult {
    const record = this.records.get(ip);

    if (!record || now >= record.windowStart + this.windowMs) {
      this.records.set(ip, { count: 1, windowStart: now });
      return {
        allowed: true,
        limit: this.limit,
        remaining: this.limit - 1,
        retryAfter: 0,
        resetTimeMs: now + this.windowMs,
      };
    }

    if (record.count < this.limit) {
      record.count += 1;
      return {
        allowed: true,
        limit: this.limit,
        remaining: this.limit - record.count,
        retryAfter: 0,
        resetTimeMs: record.windowStart + this.windowMs,
      };
    }

    const remainingMs = record.windowStart + this.windowMs - now;
    const retryAfter = Math.max(1, Math.ceil(remainingMs / 1000));

    return {
      allowed: false,
      limit: this.limit,
      remaining: 0,
      retryAfter,
      resetTimeMs: record.windowStart + this.windowMs,
    };
  }

  /** Resets all active rate-limiting windows. Used primarily in test teardowns. */
  reset(): void {
    this.records.clear();
  }
}

/** Global rate limiter protecting standard API routes (60 requests/minute per IP). */
export const apiRateLimiter = new RateLimiter(60, 60000);

/** Generous rate limiter protecting map tile rendering endpoints (500 requests/minute per IP). */
export const tileRateLimiter = new RateLimiter(500, 60000);
