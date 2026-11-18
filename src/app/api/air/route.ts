import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider } from "@/lib/air";
import { buildTodayForecast } from "@/lib/air/mapper";
import { airCache, hashLocationHourKey } from "@/lib/cache";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";

/** Maximum permitted request body byte size (2 KB) to prevent resource exhaustion. */
const MAX_BODY_BYTES = 2048;

/** Schema validating required geographical coordinates. */
const airRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Air quality endpoint handling current conditions and 24-hour forecasts.
 * Validates request size and schema, applies IP rate limits, and uses cached air data.
 */
export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  const ip = (firstForwarded ?? "127.0.0.1").trim();

  const rateCheck = apiRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large. Maximum body size is 2 KB." },
      { status: 413 },
    );
  }

  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum body size is 2 KB." },
        { status: 413 },
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload." },
        { status: 400 },
      );
    }

    const parseResult = airRequestSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180." },
        { status: 400 },
      );
    }

    const { lat, lng } = parseResult.data;
    const currentHour = new Date().getHours();
    const cacheKey = hashLocationHourKey(lat, lng, currentHour);

    const cached = airCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const provider = getAirProvider();
    const location = { lat, lng, label: "Target Location" };
    const current = await provider.current(location);
    const rawForecast = await provider.forecast(location, 24);
    const forecast = buildTodayForecast(current, rawForecast);

    const responseData = { current, forecast };
    airCache.set(cacheKey, responseData);

    return NextResponse.json(responseData, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json(
      { error: safeError.message },
      { status: safeError.status },
    );
  }
}
