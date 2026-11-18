import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { googleBinary, googleJson, googleRequest } from "@/lib/google/http";
import { AppError } from "@/lib/security/errors";

describe("Shared Google HTTP Helper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends API key in X-Goog-Api-Key header and never in URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "OK" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const secretKey = "my-super-secret-key";
    const targetUrl = "https://example.googleapis.com/v1/test";
    const res = await googleJson(targetUrl, secretKey);

    expect(res).toEqual({ status: "OK" });
    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).not.toContain(secretKey);
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe(secretKey);
  });

  it("retries on HTTP 503 with backoff and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "Service Unavailable" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: "recovered" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await googleJson("https://example.googleapis.com/v1/test", "key", {
      initialBackoffMs: 10,
      maxRetries: 2,
    });

    expect(res).toEqual({ result: "recovered" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails immediately on HTTP 400 without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Bad Request" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      googleJson("https://example.googleapis.com/v1/test", "key", { maxRetries: 2, initialBackoffMs: 10 }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles AbortError timeout by throwing AppError with 504", async () => {
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortErr);
    vi.stubGlobal("fetch", fetchMock);

    try {
      await googleRequest("https://example.googleapis.com/v1/test", "key", { timeoutMs: 50, maxRetries: 0 });
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(504);
      expect((err as AppError).message).toContain("timed out");
    }
  });

  it("supports binary responses with googleBinary", async () => {
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => dummyBuffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const bytes = await googleBinary("https://example.googleapis.com/v1/tile", "key");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("never includes the API key in thrown errors even if returned by upstream", async () => {
    const secretKey = "ai-secret-key-98765";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: `Invalid request for key ${secretKey} on resource foo`,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await googleJson("https://example.googleapis.com/v1/test", secretKey, { maxRetries: 0 });
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.message).not.toContain(secretKey);
      expect(appErr.message).toContain("[REDACTED]");
    }
  });
});
