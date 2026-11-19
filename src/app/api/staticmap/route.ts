import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getClientIp, jsonError } from "@/lib/http/route-helpers";
import { getStaticMap } from "@/lib/maps/static-map";
import { tileRateLimiter } from "@/lib/security/rate-limit";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** Same-origin proxy for the Maps Static API basemap behind the smog heatmap. */
export async function GET(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(tileRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

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
    return jsonError(err);
  }
}
