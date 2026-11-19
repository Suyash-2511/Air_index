import { NextResponse } from "next/server";
import { z } from "zod";
import { intakeHousehold } from "@/lib/gemini/intake";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { locationSchema } from "@/lib/types";

const MAX_BODY_BYTES = 2048;

const intakeRequestSchema = z.object({
  text: z.string().min(2).max(2000),
  location: locationSchema,
});

/** Intake API endpoint translating freeform user descriptions into validated Household models. */
export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult instanceof Response) return bodyResult;

  const parseResult = intakeRequestSchema.safeParse(bodyResult.data);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid intake request. Must provide text (2-2000 characters) and valid location coordinates." },
      { status: 400 },
    );
  }

  try {
    const result = await intakeHousehold(parseResult.data.text, parseResult.data.location);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
