import { NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/places/autocomplete";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Place details lookup endpoint.
 * Retrieves location coordinates and formatted address for a specified placeId.
 */
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  const ip = (firstForwarded ?? "127.0.0.1").trim();

  const rateCheck = apiRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  try {
    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Missing place identifier." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("sessionToken") ?? undefined;

    const place = await fetchPlaceDetails(id, sessionToken);
    return NextResponse.json({ place }, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
