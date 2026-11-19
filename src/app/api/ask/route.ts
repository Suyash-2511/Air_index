import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider } from "@/lib/air";
import { buildTodayForecast } from "@/lib/air/mapper";
import { askQuestion } from "@/lib/gemini/ask";
import { getInterventionTitle } from "@/lib/gemini/grounding";
import { enforceRateLimit, getClientIp, jsonError, readJsonBody } from "@/lib/http/route-helpers";
import { buildPlan } from "@/lib/interventions/rank";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { householdSchema, type DayForecast } from "@/lib/types";

const MAX_BODY_BYTES = 8192;

const askRequestSchema = z.object({
  question: z.string().min(2).max(500),
  household: householdSchema,
});

/** Question-answering endpoint grounded exclusively in the household's computed exposure plan. */
export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitResponse = enforceRateLimit(apiRateLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (bodyResult instanceof Response) return bodyResult;

  const parseResult = askRequestSchema.safeParse(bodyResult.data);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid ask request. Question must be 2-500 characters with a valid household model." },
      { status: 400 },
    );
  }

  try {
    const { question, household } = parseResult.data;

    const provider = getAirProvider();
    const current = await provider.current(household.location);
    const rawForecast = await provider.forecast(household.location, 24);
    const forecast = buildTodayForecast(current, rawForecast);

    const dayForecastMap: DayForecast = new Map(forecast.map((f) => [f.hour, f.pm25]));
    const computedPlan = buildPlan(household, dayForecastMap);

    const result = await askQuestion(question, computedPlan, household);
    const citations = result.citedInterventionIds.map((id) => getInterventionTitle(id));

    return NextResponse.json({ ...result, citations }, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
