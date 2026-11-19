import { NextResponse } from "next/server";
import { z } from "zod";
import { autocompleteCache, hashNormalizedInputKey } from "@/lib/cache";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { fetchAutocomplete } from "@/lib/places/autocomplete";
import { apiRateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 2048;

const placesSearchSchema = z.object({
  input: z.string(),
  sessionToken: z.string().optional(),
});

/** Places search endpoint returning autocomplete predictions. */
export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult instanceof Response) return bodyResult;

  const parseResult = placesSearchSchema.safeParse(bodyResult.data);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request payload format." }, { status: 400 });
  }

  const { input, sessionToken } = parseResult.data;
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return NextResponse.json({ error: "Search query must be between 2 and 100 characters." }, { status: 400 });
  }

  try {
    const cacheKey = hashNormalizedInputKey(trimmed);
    const cached = autocompleteCache.get(cacheKey);
    if (cached) return NextResponse.json({ predictions: cached }, { status: 200 });

    const predictions = await fetchAutocomplete(trimmed, sessionToken);
    autocompleteCache.set(cacheKey, predictions);
    return NextResponse.json({ predictions }, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
