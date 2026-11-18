import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/air/route";
import { airCache } from "@/lib/cache";
import { apiRateLimiter } from "@/lib/security/rate-limit";

describe("API Air Route Security & Validation", () => {
  beforeEach(() => {
    apiRateLimiter.reset();
    airCache.clear();
  });

  it("returns 200 with current and forecast on valid coordinates", async () => {
    const req = new Request("http://localhost/api/air", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: JSON.stringify({ lat: 28.61, lng: 77.21 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.current).toBeDefined();
    expect(data.current.pm25).toBeGreaterThan(0);
    expect(data.forecast).toBeInstanceOf(Array);
    expect(data.forecast).toHaveLength(24);
  });

  it("returns 400 on out-of-range coordinates", async () => {
    const req = new Request("http://localhost/api/air", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
      body: JSON.stringify({ lat: 100, lng: 77.21 }), // lat > 90
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error).not.toContain("stack");
  });

  it("returns 400 on malformed JSON payload", async () => {
    const req = new Request("http://localhost/api/air", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: "{ not valid json ",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 413 when request body exceeds 2 KB", async () => {
    const padding = "x".repeat(2100);
    const req = new Request("http://localhost/api/air", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "2150",
        "x-forwarded-for": "10.0.0.4",
      },
      body: JSON.stringify({ lat: 28.61, lng: 77.21, padding }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toContain("Payload too large");
  });

  it("returns 429 and Retry-After header when rate limit is exceeded", async () => {
    const ip = "10.0.0.5";

    for (let i = 0; i < 60; i++) {
      const allowedReq = new Request("http://localhost/api/air", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ lat: 28.61, lng: 77.21 }),
      });
      const res = await POST(allowedReq);
      expect(res.status).toBe(200);
    }

    const limitedReq = new Request("http://localhost/api/air", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ lat: 28.61, lng: 77.21 }),
    });
    const limitedRes = await POST(limitedReq);
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers.get("Retry-After")).toBeDefined();

    const data = await limitedRes.json();
    expect(data.error).toContain("Too many requests");
  });
});
