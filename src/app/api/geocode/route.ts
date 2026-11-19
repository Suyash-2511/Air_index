import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeCache, hashGeocodeKey } from "@/lib/cache";
import { jsonError, parseGuardedRequest } from "@/lib/http";
import { reverseGeocode } from "@/lib/places";

const MAX_BODY_BYTES = 2048;

const geocodeRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Reverse geocoding endpoint returning friendly locality/city labels. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: geocodeRequestSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180.",
  });
  if (guarded instanceof Response) return guarded;

  try {
    const { lat, lng } = guarded.data;
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
