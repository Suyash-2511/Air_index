import { NextResponse } from "next/server";
import type { z } from "zod";
import { HTTP_STATUS, toSafeError } from "../security";
import { apiRateLimiter, type RateLimiter } from "../security";

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
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
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
    return NextResponse.json({ error: tooLargeMsg }, { status: HTTP_STATUS.PAYLOAD_TOO_LARGE });
  }

  const rawText = await request.text();
  if (new TextEncoder().encode(rawText).length > maxBytes) {
    return NextResponse.json({ error: tooLargeMsg }, { status: HTTP_STATUS.PAYLOAD_TOO_LARGE });
  }

  try {
    // The route validates the body with its schema straight after; T is that schema's input type.
    const data = JSON.parse(rawText) as T;
    return { data };
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}

/** Converts an unknown error into a sanitized JSON response with appropriate status code. */
export function jsonError(err: unknown): Response {
  const safeError = toSafeError(err);
  return NextResponse.json({ error: safeError.message }, { status: safeError.status });
}

/** What a route declares about its request; the shared guard sequence does the rest. */
interface GuardedRequestOptions<Schema extends z.ZodType> {
  schema: Schema;
  maxBytes: number;
  /** Shown to the client when the body is well-formed JSON but fails the schema. */
  invalidMessage: string;
}

/**
 * Runs the guard sequence every API route needs, in this order: rate limit, size-limited JSON read,
 * schema validation. Returns the parsed data, or the Response to send back unchanged.
 */
export async function parseGuardedRequest<Schema extends z.ZodType>(
  request: Request,
  { schema, maxBytes, invalidMessage }: GuardedRequestOptions<Schema>,
): Promise<{ data: z.output<Schema> } | Response> {
  const limited = enforceRateLimit(apiRateLimiter, getClientIp(request));
  if (limited) return limited;

  const body = await readJsonBody(request, maxBytes);
  if (body instanceof Response) return body;

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: invalidMessage }, { status: HTTP_STATUS.BAD_REQUEST });
  return { data: parsed.data };
}
