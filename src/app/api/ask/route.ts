import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider } from "@/lib/air";
import { buildTodayForecast } from "@/lib/air/mapper";
import { askQuestion } from "@/lib/gemini/ask";
import { getInterventionTitle } from "@/lib/gemini/grounding";
import { buildPlan } from "@/lib/interventions/rank";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { householdSchema, type DayForecast } from "@/lib/types";

const MAX_BODY_BYTES = 8192;

const askRequestSchema = z.object({
  question: z.string().min(2).max(500),
  household: householdSchema,
});

/**
 * Question-answering endpoint grounded exclusively in the household's computed exposure plan.
 * Applies rate limiting, input payload validation, prompt injection defenses, and safe error masking.
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
      { error: "Payload too large. Maximum body size is 8 KB." },
      { status: 413 },
    );
  }

  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum body size is 8 KB." },
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

    const parseResult = askRequestSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid ask request. Question must be 2-500 characters with a valid household model." },
        { status: 400 },
      );
    }

    const { question, household } = parseResult.data;

    const provider = getAirProvider();
    const current = await provider.current(household.location);
    const rawForecast = await provider.forecast(household.location, 24);
    const forecast = buildTodayForecast(current, rawForecast);

    const dayForecastMap: DayForecast = new Map(forecast.map((f) => [f.hour, f.pm25]));
    const computedPlan = buildPlan(household, dayForecastMap);

    const result = await askQuestion(question, computedPlan, household);

    // The client shows cited changes by their plain-language titles, not internal ids.
    const citations = result.citedInterventionIds.map((id) => getInterventionTitle(id));
    return NextResponse.json({ ...result, citations }, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
