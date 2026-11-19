import { NextResponse } from "next/server";
import { z } from "zod";
import { intakeHousehold } from "@/lib/gemini";
import { jsonError, parseGuardedRequest } from "@/lib/http";
import { locationSchema } from "@/lib/types";

const MAX_BODY_BYTES = 2048;

const intakeRequestSchema = z.object({
  text: z.string().min(2).max(2000),
  location: locationSchema,
});

/** Intake API endpoint translating freeform user descriptions into validated Household models. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: intakeRequestSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid intake request. Must provide text (2-2000 characters) and valid location coordinates.",
  });
  if (guarded instanceof Response) return guarded;

  try {
    const result = await intakeHousehold(guarded.data.text, guarded.data.location);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
