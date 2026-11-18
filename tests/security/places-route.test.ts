import { beforeEach, describe, expect, it } from "vitest";
import { GET as getPlaceRoute } from "@/app/api/places/[id]/route";
import { POST as searchPlacesRoute } from "@/app/api/places/route";
import { autocompleteCache } from "@/lib/cache";
import { apiRateLimiter } from "@/lib/security/rate-limit";

describe("Places Route Security & Validation", () => {
  beforeEach(() => {
    apiRateLimiter.reset();
    autocompleteCache.clear();
  });

  it("returns 200 with predictions for valid input", async () => {
    const req = new Request("http://localhost/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.1" },
      body: JSON.stringify({ input: "Connaught" }),
    });

    const res = await searchPlacesRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.predictions).toBeInstanceOf(Array);
    expect(data.predictions.length).toBeGreaterThan(0);
  });

  it("returns 400 for input shorter than 2 characters", async () => {
    const req = new Request("http://localhost/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.2" },
      body: JSON.stringify({ input: "C" }),
    });

    const res = await searchPlacesRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("between 2 and 100");
  });

  it("returns 413 when payload exceeds 2 KB", async () => {
    const padding = "x".repeat(2100);
    const req = new Request("http://localhost/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.3" },
      body: JSON.stringify({ input: "Delhi", padding }),
    });

    const res = await searchPlacesRoute(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toContain("Payload too large");
  });

  it("returns 429 when rate limit is exceeded on places route", async () => {
    const ip = "10.0.1.4";

    for (let i = 0; i < 60; i++) {
      const allowedReq = new Request("http://localhost/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ input: "Delhi" }),
      });
      const res = await searchPlacesRoute(allowedReq);
      expect(res.status).toBe(200);
    }

    const limitedReq = new Request("http://localhost/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ input: "Delhi" }),
    });
    const limitedRes = await searchPlacesRoute(limitedReq);
    expect(limitedRes.status).toBe(429);
  });

  it("returns 200 with details for GET /api/places/[id]", async () => {
    const req = new Request("http://localhost/api/places/fixture-delhi-connaught", {
      headers: { "x-forwarded-for": "10.0.1.5" },
    });

    const res = await getPlaceRoute(req, {
      params: Promise.resolve({ id: "fixture-delhi-connaught" }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.place).toBeDefined();
    expect(data.place.label).toContain("Connaught Place");
    expect(data.place.lat).toBeGreaterThan(0);
  });
});
