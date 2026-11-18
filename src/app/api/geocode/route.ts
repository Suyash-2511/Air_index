import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeCache, hashGeocodeKey } from "@/lib/cache";
import { reverseGeocode } from "@/lib/places/geocode";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 2048;

const geocodeRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Reverse geocoding endpoint returning friendly locality/city labels.
 * Enforces rate limiting, 2 KB payload limit, coordinate validation,
 * and 7-day caching keyed by 3-decimal rounded coordinates.
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

    const parseResult = geocodeRequestSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180." },
        { status: 400 },
      );
    }

    const { lat, lng } = parseResult.data;
    const cacheKey = hashGeocodeKey(lat, lng);
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ location: cached }, { status: 200 });
    }

    const location = await reverseGeocode(lat, lng);
    geocodeCache.set(cacheKey, location);

    return NextResponse.json({ location }, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
