import { NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, jsonError } from "@/lib/http";
import { fetchPlaceDetails } from "@/lib/places";
import { apiRateLimiter, HTTP_STATUS } from "@/lib/security";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/** Place details lookup endpoint retrieving location coordinates and address for a placeId. */
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Missing place identifier." }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("sessionToken") ?? undefined;

    const place = await fetchPlaceDetails(id, sessionToken);
    return NextResponse.json({ place }, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
