import { beforeEach, describe, expect, it } from "vitest";
import { POST as geocodeRoute } from "@/app/api/geocode/route";
import { geocodeCache } from "@/lib/cache";
import { apiRateLimiter } from "@/lib/security/rate-limit";

describe("Geocode Route Security & Validation", () => {
  beforeEach(() => {
    apiRateLimiter.reset();
    geocodeCache.clear();
  });

  it("returns 200 with reverse geocoded location", async () => {
    const req = new Request("http://localhost/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.1" },
      body: JSON.stringify({ lat: 28.6139, lng: 77.209 }),
    });

    const res = await geocodeRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.location).toBeDefined();
    expect(data.location.label).toContain("Delhi");
    expect(data.location.lat).toBe(28.6139);
  });

  it("returns 400 on invalid coordinates", async () => {
    const req = new Request("http://localhost/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.2" },
      body: JSON.stringify({ lat: 95, lng: 77.209 }),
    });

    const res = await geocodeRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Invalid coordinates");
  });

  it("returns 413 on body exceeding 2 KB", async () => {
    const padding = "x".repeat(2100);
    const req = new Request("http://localhost/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.3" },
      body: JSON.stringify({ lat: 28.61, lng: 77.21, padding }),
    });

    const res = await geocodeRoute(req);
    expect(res.status).toBe(413);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const ip = "10.0.2.4";

    for (let i = 0; i < 60; i++) {
      const allowed = new Request("http://localhost/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ lat: 28.61, lng: 77.21 }),
      });
      const res = await geocodeRoute(allowed);
      expect(res.status).toBe(200);
    }

    const limited = new Request("http://localhost/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ lat: 28.61, lng: 77.21 }),
    });
    const limitedRes = await geocodeRoute(limited);
    expect(limitedRes.status).toBe(429);
  });
});
