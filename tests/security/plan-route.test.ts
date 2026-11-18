import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/plan/route";
import { planCache } from "@/lib/cache";
import * as explainModule from "@/lib/gemini/explain";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import type { Household } from "@/lib/types";

describe("POST /api/plan Route Security & Validation", () => {
  const validHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "User",
        ageBand: "adult",
        sensitivities: [],
        windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: { lat: 28.61, lng: 77.21, label: "Delhi" },
  };

  beforeEach(() => {
    apiRateLimiter.reset();
    planCache.clear();
    vi.restoreAllMocks();
  });

  it("makes exactly one Gemini call on first request, zero on repeat (cache hit)", async () => {
    const explainSpy = vi.spyOn(explainModule, "explainPlan");

    const req1 = new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "12.0.0.1" },
      body: JSON.stringify({ household: validHousehold }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    expect(explainSpy).toHaveBeenCalledTimes(1);

    const req2 = new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "12.0.0.1" },
      body: JSON.stringify({ household: validHousehold }),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    // Still 1: cached plan was used, 0 additional Gemini calls
    expect(explainSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on invalid household payload", async () => {
    const req = new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "12.0.0.2" },
      body: JSON.stringify({ household: { members: [] } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 413 when payload exceeds 8 KB limit", async () => {
    const oversized = "x".repeat(8500);
    const req = new Request("http://localhost/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "8600",
        "x-forwarded-for": "12.0.0.3",
      },
      body: JSON.stringify({ household: validHousehold, padding: oversized }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const ip = "12.0.0.4";
    for (let i = 0; i < 60; i++) {
      const allowedReq = new Request("http://localhost/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ household: validHousehold }),
      });
      const res = await POST(allowedReq);
      expect(res.status).toBe(200);
    }

    const blockedReq = new Request("http://localhost/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ household: validHousehold }),
    });
    const res = await POST(blockedReq);
    expect(res.status).toBe(429);
  });
});
