import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/intake/route";
import { apiRateLimiter } from "@/lib/security/rate-limit";

describe("POST /api/intake Route Security & Validation", () => {
  const validLocation = { lat: 28.6139, lng: 77.209, label: "New Delhi" };

  beforeEach(() => {
    apiRateLimiter.reset();
  });

  it("returns 200 with structured household on valid text and location", async () => {
    const req = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "11.0.0.1" },
      body: JSON.stringify({
        text: "my mother has asthma, I cycle to work at 8, we cook on LPG and keep windows open",
        location: validLocation,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.household).toBeDefined();
    expect(data.household.location).toEqual(validLocation);
    expect(data.household.members.length).toBeGreaterThanOrEqual(1);
    expect(data.assumed).toBeInstanceOf(Array);
  });

  it("returns 400 when location is missing or text is too short", async () => {
    const req1 = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "11.0.0.2" },
      body: JSON.stringify({ text: "a", location: validLocation }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "11.0.0.2" },
      body: JSON.stringify({ text: "valid text description" }), // missing location
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("returns 413 when body exceeds 2 KB limit", async () => {
    const req = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "2200",
        "x-forwarded-for": "11.0.0.3",
      },
      body: JSON.stringify({ text: "x".repeat(2100), location: validLocation }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toContain("Payload too large");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const ip = "11.0.0.4";
    for (let i = 0; i < 60; i++) {
      const allowedReq = new Request("http://localhost/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ text: "household with 2 members", location: validLocation }),
      });
      const res = await POST(allowedReq);
      expect(res.status).toBe(200);
    }

    const blockedReq = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ text: "household with 2 members", location: validLocation }),
    });
    const res = await POST(blockedReq);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeDefined();
  });
});
