import { NextResponse } from "next/server";
import { z } from "zod";
import { autocompleteCache, hashNormalizedInputKey } from "@/lib/cache";
import { fetchAutocomplete } from "@/lib/places/autocomplete";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 2048;

const placesSearchSchema = z.object({
  input: z.string(),
  sessionToken: z.string().optional(),
});

/**
 * Places search endpoint returning autocomplete predictions.
 * Enforces rate limiting, 2 KB payload limit, input length validation (2-100 chars),
 * and 24-hour result caching.
 */
export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  const ip = (firstForwarded ?? "127.0.0.1").trim();

  const rateCheck = apiRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large. Maximum body size is 2 KB." }, { status: 413 });
  }

  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large. Maximum body size is 2 KB." }, { status: 413 });
    }

    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }

    const parseResult = placesSearchSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid request payload format." }, { status: 400 });
    }

    const { input, sessionToken } = parseResult.data;
    const trimmed = input.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return NextResponse.json({ error: "Search query must be between 2 and 100 characters." }, { status: 400 });
    }

    const cacheKey = hashNormalizedInputKey(trimmed);
    const cached = autocompleteCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ predictions: cached }, { status: 200 });
    }

    const predictions = await fetchAutocomplete(trimmed, sessionToken);
    autocompleteCache.set(cacheKey, predictions);

    return NextResponse.json({ predictions }, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
