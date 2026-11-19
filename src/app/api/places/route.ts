import { NextResponse } from "next/server";
import { z } from "zod";
import { autocompleteCache, hashNormalizedInputKey } from "@/lib/cache";
import { jsonError, parseGuardedRequest } from "@/lib/http";
import { fetchAutocomplete } from "@/lib/places";
import { HTTP_STATUS } from "@/lib/security";

const MAX_BODY_BYTES = 2048;

const placesSearchSchema = z.object({
  input: z.string(),
  sessionToken: z.string().optional(),
});

/** Places search endpoint returning autocomplete predictions. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: placesSearchSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid request payload format.",
  });
  if (guarded instanceof Response) return guarded;

  const { input, sessionToken } = guarded.data;
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return NextResponse.json({ error: "Search query must be between 2 and 100 characters." }, { status: HTTP_STATUS.BAD_REQUEST });
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
