import { NextResponse } from "next/server";
import { getHeatmapTile } from "@/lib/air/heatmap";
import { toSafeError } from "@/lib/security/errors";
import { tileRateLimiter } from "@/lib/security/rate-limit";

interface RouteParams {
  params: Promise<{
    zoom: string;
    x: string;
    y: string;
  }>;
}

/**
 * Air quality heatmap tile proxy endpoint.
 * Validates zoom (0-16) and x/y grid coordinates, enforces dedicated rate limits,
 * caches tiles in memory, and serves PNG tiles with public Cache-Control headers.
 */
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  const ip = (firstForwarded ?? "127.0.0.1").trim();

  const rateCheck = tileRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      },
    );
  }

  try {
    const resolvedParams = await params;
    const zoom = parseInt(resolvedParams.zoom, 10);
    const x = parseInt(resolvedParams.x, 10);
    const y = parseInt(resolvedParams.y, 10);

    if (Number.isNaN(zoom) || Number.isNaN(x) || Number.isNaN(y)) {
      return NextResponse.json({ error: "Tile coordinates must be integers." }, { status: 400 });
    }

    const tile = await getHeatmapTile(zoom, x, y);

    return new Response(Buffer.from(tile), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
