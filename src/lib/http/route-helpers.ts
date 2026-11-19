import { NextResponse } from "next/server";
import { toSafeError } from "../security/errors";
import type { RateLimiter } from "../security/rate-limit";

/** Extracts the client IP address from the x-forwarded-for header or defaults to localhost. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  return (firstForwarded ?? "127.0.0.1").trim();
}

/** Enforces rate limiting on an IP address, returning a 429 Response if exceeded or null if permitted. */
export function enforceRateLimit(limiter: RateLimiter, ip: string): Response | null {
  const check = limiter.check(ip);
  if (!check.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(check.retryAfter) },
      },
    );
  }
  return null;
}

/** Reads and parses JSON from the request body, rejecting payloads exceeding maxBytes or with malformed JSON. */
export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<{ data: T } | Response> {
  const maxKb = Math.round(maxBytes / 1024);
  const tooLargeMsg = `Payload too large. Maximum body size is ${maxKb} KB.`;

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json({ error: tooLargeMsg }, { status: 413 });
  }

  const rawText = await request.text();
  if (new TextEncoder().encode(rawText).length > maxBytes) {
    return NextResponse.json({ error: tooLargeMsg }, { status: 413 });
  }

  try {
    const data = JSON.parse(rawText) as T;
    return { data };
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }
}

/** Converts an unknown error into a sanitized JSON response with appropriate status code. */
export function jsonError(err: unknown): Response {
  const safeError = toSafeError(err);
  return NextResponse.json({ error: safeError.message }, { status: safeError.status });
}
