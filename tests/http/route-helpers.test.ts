import { describe, expect, it } from "vitest";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { AppError } from "@/lib/security/errors";
import { RateLimiter } from "@/lib/security/rate-limit";

describe("Route Helpers", () => {
  describe("getClientIp", () => {
    it("extracts the first IP from comma-separated x-forwarded-for header", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      });
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("extracts single IP from x-forwarded-for header", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "  198.51.100.1  " },
      });
      expect(getClientIp(req)).toBe("198.51.100.1");
    });

    it("falls back to 127.0.0.1 when header is absent", () => {
      const req = new Request("http://localhost");
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("enforceRateLimit", () => {
    it("returns null when request count is within limit", () => {
      const limiter = new RateLimiter(5, 60000);
      const result = enforceRateLimit(limiter, "192.168.1.1");
      expect(result).toBeNull();
    });

    it("returns a 429 response with Retry-After header when rate limit is exceeded", async () => {
      const limiter = new RateLimiter(2, 60000);
      expect(enforceRateLimit(limiter, "192.168.1.2")).toBeNull();
      expect(enforceRateLimit(limiter, "192.168.1.2")).toBeNull();

      const blocked = enforceRateLimit(limiter, "192.168.1.2");
      expect(blocked).not.toBeNull();
      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get("Retry-After")).toBeDefined();

      const body = await blocked?.json();
      expect(body.error).toContain("Too many requests");
    });
  });

  describe("readJsonBody", () => {
    it("parses valid JSON when within size limits", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valid: true, count: 42 }),
      });
      const result = await readJsonBody<{ valid: boolean; count: number }>(req, 1024);
      expect(result).not.toBeInstanceOf(Response);
      if (!(result instanceof Response)) {
        expect(result.data).toEqual({ valid: true, count: 42 });
      }
    });

    it("returns 413 when Content-Length header exceeds maxBytes", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Length": "2048" },
        body: JSON.stringify({ a: 1 }),
      });
      const result = await readJsonBody(req, 1024);
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(413);
        const data = await result.json();
        expect(data.error).toContain("Payload too large");
      }
    });

    it("returns 413 when actual body bytes exceed maxBytes", async () => {
      const largePayload = { text: "x".repeat(1500) };
      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify(largePayload),
      });
      const result = await readJsonBody(req, 1024);
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(413);
        const data = await result.json();
        expect(data.error).toContain("Payload too large");
      }
    });

    it("returns 400 when body contains malformed JSON", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: "not json at all {",
      });
      const result = await readJsonBody(req, 1024);
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(400);
        const data = await result.json();
        expect(data.error).toContain("Malformed JSON payload");
      }
    });
  });

  describe("jsonError", () => {
    it("maps AppError into a JSON response with status and message", async () => {
      const res = jsonError(new AppError(404, "Target resource not found"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Target resource not found");
    });

    it("maps generic Error into a safe 500 JSON response", async () => {
      const res = jsonError(new Error("Database connection timed out"));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("An internal error occurred. Please try again later.");
    });
  });
});
