import { beforeEach, describe, expect, it } from "vitest";
import { GET as getTileRoute } from "@/app/api/tiles/[zoom]/[x]/[y]/route";
import { tileCache } from "@/lib/cache";
import { tileRateLimiter } from "@/lib/security/rate-limit";

describe("Tile Route Security & Validation", () => {
  beforeEach(() => {
    tileRateLimiter.reset();
    tileCache.clear();
  });

  it("returns 200 with image/png and Cache-Control header", async () => {
    const req = new Request("http://localhost/api/tiles/10/512/512", {
      headers: { "x-forwarded-for": "10.0.3.1" },
    });

    const res = await getTileRoute(req, {
      params: Promise.resolve({ zoom: "10", x: "512", y: "512" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=1800");

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("returns 400 when tile coordinates are out of bounds", async () => {
    const req = new Request("http://localhost/api/tiles/10/2000/512", {
      headers: { "x-forwarded-for": "10.0.3.2" },
    });

    // At zoom 10, max index is 1023
    const res = await getTileRoute(req, {
      params: Promise.resolve({ zoom: "10", x: "2000", y: "512" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid x coordinate");
  });

  it("returns 400 on non-integer tile coordinates", async () => {
    const req = new Request("http://localhost/api/tiles/invalid/0/0", {
      headers: { "x-forwarded-for": "10.0.3.3" },
    });

    const res = await getTileRoute(req, {
      params: Promise.resolve({ zoom: "abc", x: "0", y: "0" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("must be integers");
  });

  it("returns 429 when tile rate limit (500/min) is exceeded", async () => {
    const ip = "10.0.3.4";

    for (let i = 0; i < 500; i++) {
      const allowed = new Request("http://localhost/api/tiles/0/0/0", {
        headers: { "x-forwarded-for": ip },
      });
      const res = await getTileRoute(allowed, {
        params: Promise.resolve({ zoom: "0", x: "0", y: "0" }),
      });
      expect(res.status).toBe(200);
    }

    const limited = new Request("http://localhost/api/tiles/0/0/0", {
      headers: { "x-forwarded-for": ip },
    });
    const limitedRes = await getTileRoute(limited, {
      params: Promise.resolve({ zoom: "0", x: "0", y: "0" }),
    });

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers.get("Retry-After")).toBeDefined();
  });
});
