import { MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND } from "../time-units";

/** Outcome of checking a client request against the rate limiter. */
interface RateLimitResult {
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

/** Per-client limits: ordinary API calls are costly (model and provider quota), while a map draws many tiles at once. */
const API_REQUESTS_PER_MINUTE = 60;
const TILE_REQUESTS_PER_MINUTE = 500;

/**
 * Fixed-window rate limiter per client IP address.
 * Prevents API abuse and DoS attacks by bounding request bursts.
 */
export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly records = new Map<string, WindowRecord>();

  constructor(limit = API_REQUESTS_PER_MINUTE, windowMs = MILLISECONDS_PER_MINUTE) {
    this.limit = Math.max(1, limit);
    this.windowMs = Math.max(MILLISECONDS_PER_SECOND, windowMs);
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
    const retryAfter = Math.max(1, Math.ceil(remainingMs / MILLISECONDS_PER_SECOND));

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
export const apiRateLimiter = new RateLimiter(API_REQUESTS_PER_MINUTE, MILLISECONDS_PER_MINUTE);

/** Generous rate limiter protecting map tile rendering endpoints (500 requests/minute per IP). */
export const tileRateLimiter = new RateLimiter(TILE_REQUESTS_PER_MINUTE, MILLISECONDS_PER_MINUTE);
