import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaticMap } from "@/lib/maps/static-map";
import { toSafeError } from "@/lib/security/errors";
import { tileRateLimiter } from "@/lib/security/rate-limit";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/**
 * Same-origin proxy for the Maps Static API basemap behind the smog heatmap.
 * Keeps the key on the server, validates coordinates and rate-limits per IP.
 */
export async function GET(request: Request): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] ?? "127.0.0.1").trim();
  const rateCheck = tileRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const rawLat = url.searchParams.get("lat");
  const rawLng = url.searchParams.get("lng");
  if (!rawLat || !rawLng) {
    return NextResponse.json({ error: "lat and lng must be valid coordinates." }, { status: 400 });
  }

  const parsed = querySchema.safeParse({ lat: rawLat, lng: rawLng });
  if (!parsed.success) {
    return NextResponse.json({ error: "lat and lng must be valid coordinates." }, { status: 400 });
  }

  try {
    const image = await getStaticMap(parsed.data.lat, parsed.data.lng);
    return new Response(Buffer.from(image), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=21600" },
    });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
