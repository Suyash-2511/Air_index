import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeCache, hashGeocodeKey } from "@/lib/cache";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { reverseGeocode } from "@/lib/places/geocode";
import { apiRateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 2048;

const geocodeRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Reverse geocoding endpoint returning friendly locality/city labels. */
export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult instanceof Response) return bodyResult;

  const parseResult = geocodeRequestSchema.safeParse(bodyResult.data);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180." },
      { status: 400 },
    );
  }

  try {
    const { lat, lng } = parseResult.data;
    const cacheKey = hashGeocodeKey(lat, lng);
    const cached = geocodeCache.get(cacheKey);
    if (cached) return NextResponse.json({ location: cached }, { status: 200 });

    const location = await reverseGeocode(lat, lng);
    geocodeCache.set(cacheKey, location);
    return NextResponse.json({ location }, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
