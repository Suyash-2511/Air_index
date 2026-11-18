import { NextResponse } from "next/server";
import { z } from "zod";
import { intakeHousehold } from "@/lib/gemini/intake";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { locationSchema } from "@/lib/types";

const MAX_BODY_BYTES = 2048;

const intakeRequestSchema = z.object({
  text: z.string().min(2).max(2000),
  location: locationSchema,
});

/**
 * Intake API endpoint translating freeform user descriptions into validated Household models.
 * Applies IP rate limiting, size limits, injection defenses, and safe error masking.
 */
export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0] : undefined;
  const ip = (firstForwarded ?? "127.0.0.1").trim();

  const rateCheck = apiRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large. Maximum body size is 2 KB." },
      { status: 413 },
    );
  }

  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum body size is 2 KB." },
        { status: 413 },
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload." },
        { status: 400 },
      );
    }

    const parseResult = intakeRequestSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid intake request. Must provide text (2-2000 characters) and valid location coordinates." },
        { status: 400 },
      );
    }

    const result = await intakeHousehold(parseResult.data.text, parseResult.data.location);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
