import { beforeEach, describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/security/rate-limit";

describe("Fixed-Window Rate Limiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000); // 3 requests per 1000ms window
  });

  it("allows requests up to the configured limit", () => {
    const ip = "192.168.1.1";

    const res1 = limiter.check(ip, 1000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(ip, 1100);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(ip, 1200);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("rejects requests exceeding the limit and calculates Retry-After", () => {
    const ip = "192.168.1.2";

    limiter.check(ip, 1000);
    limiter.check(ip, 1100);
    limiter.check(ip, 1200);

    // 4th request at 1400ms: window ends at 2000ms, 600ms left -> ceil(600/1000) = 1s
    const res4 = limiter.check(ip, 1400);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfter).toBe(1);
  });

  it("resets window after windowMs elapses", () => {
    const ip = "192.168.1.3";

    limiter.check(ip, 1000);
    limiter.check(ip, 1100);
    limiter.check(ip, 1200);

    // Exceeded at 1300ms
    expect(limiter.check(ip, 1300).allowed).toBe(false);

    // After window reset at 2001ms
    const resReset = limiter.check(ip, 2001);
    expect(resReset.allowed).toBe(true);
    expect(resReset.remaining).toBe(2);
  });

  it("manually resets all records", () => {
    const ip = "192.168.1.4";

    limiter.check(ip, 1000);
    limiter.check(ip, 1100);
    limiter.check(ip, 1200);
    expect(limiter.check(ip, 1300).allowed).toBe(false);

    limiter.reset();

    const res = limiter.check(ip, 1350);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(2);
  });
});
