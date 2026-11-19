import { NextResponse } from "next/server";
import { getHeatmapTile } from "@/lib/air";
import { enforceRateLimit, getClientIp, jsonError } from "@/lib/http";
import { HTTP_STATUS, tileRateLimiter } from "@/lib/security";

interface RouteParams {
  params: Promise<{
    zoom: string;
    x: string;
    y: string;
  }>;
}

/** Air quality heatmap tile proxy endpoint serving cached PNG tiles. */
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(tileRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const resolvedParams = await params;
    const zoom = parseInt(resolvedParams.zoom, 10);
    const x = parseInt(resolvedParams.x, 10);
    const y = parseInt(resolvedParams.y, 10);

    if (Number.isNaN(zoom) || Number.isNaN(x) || Number.isNaN(y)) {
      return NextResponse.json({ error: "Tile coordinates must be integers." }, { status: HTTP_STATUS.BAD_REQUEST });
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
    return jsonError(err);
  }
}
