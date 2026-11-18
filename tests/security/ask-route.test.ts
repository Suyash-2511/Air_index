import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/ask/route";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import type { Household } from "@/lib/types";

describe("POST /api/ask Route Security & Validation", () => {
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
  });

  it("returns 200 with answer for valid question and household", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "13.0.0.1" },
      body: JSON.stringify({
        question: "Should my family use a mask?",
        household: validHousehold,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.answer).toBeDefined();
    expect(data.answerable).toBe(true);
    expect(data.citedInterventionIds).toBeInstanceOf(Array);
  });

  it("returns 400 when question is missing or too short", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "13.0.0.2" },
      body: JSON.stringify({ question: "", household: validHousehold }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 413 when payload exceeds 8 KB limit", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "8600",
        "x-forwarded-for": "13.0.0.3",
      },
      body: JSON.stringify({
        question: "valid question",
        household: validHousehold,
        padding: "x".repeat(8500),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const ip = "13.0.0.4";
    for (let i = 0; i < 60; i++) {
      const allowedReq = new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ question: "Is air purifier recommended?", household: validHousehold }),
      });
      const res = await POST(allowedReq);
      expect(res.status).toBe(200);
    }

    const blockedReq = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ question: "Is air purifier recommended?", household: validHousehold }),
    });
    const res = await POST(blockedReq);
    expect(res.status).toBe(429);
  });
});
