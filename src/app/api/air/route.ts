import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider, loadTodayForecast } from "@/lib/air";
import { getLocationCurrentHour } from "@/lib/air";
import { airCache, hashLocationHourKey } from "@/lib/cache";
import { jsonError, parseGuardedRequest } from "@/lib/http";

const MAX_BODY_BYTES = 2048;

const airRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Air quality endpoint handling current conditions and 24-hour forecasts. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: airRequestSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180.",
  });
  if (guarded instanceof Response) return guarded;

  try {
    const { lat, lng } = guarded.data;
    const localHour = getLocationCurrentHour("in");
    const cacheKey = hashLocationHourKey(lat, lng, localHour);

    const cached = airCache.get(cacheKey);
    if (cached) return NextResponse.json(cached, { status: 200 });

    const location = { lat, lng, label: "Target Location" };
    const { current, forecast } = await loadTodayForecast(getAirProvider(), location);

    const responseData = { current, forecast };
    airCache.set(cacheKey, responseData);
    return NextResponse.json(responseData, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
