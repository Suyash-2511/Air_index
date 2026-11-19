import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider } from "@/lib/air";
import { buildTodayForecast, getLocationCurrentHour } from "@/lib/air/mapper";
import { airCache, hashLocationHourKey } from "@/lib/cache";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { apiRateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 2048;

const airRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Air quality endpoint handling current conditions and 24-hour forecasts. */
export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult instanceof Response) return bodyResult;

  const parseResult = airRequestSchema.safeParse(bodyResult.data);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180." },
      { status: 400 },
    );
  }

  try {
    const { lat, lng } = parseResult.data;
    const localHour = getLocationCurrentHour("in");
    const cacheKey = hashLocationHourKey(lat, lng, localHour);

    const cached = airCache.get(cacheKey);
    if (cached) return NextResponse.json(cached, { status: 200 });

    const provider = getAirProvider();
    const location = { lat, lng, label: "Target Location" };
    const current = await provider.current(location);
    const rawForecast = await provider.forecast(location, 24);
    const forecast = buildTodayForecast(current, rawForecast);

    const responseData = { current, forecast };
    airCache.set(cacheKey, responseData);
    return NextResponse.json(responseData, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
