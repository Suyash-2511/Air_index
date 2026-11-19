import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider, loadTodayForecast } from "@/lib/air";
import { askQuestion } from "@/lib/gemini";
import { jsonError, parseGuardedRequest } from "@/lib/http";
import { buildPlan, getInterventionTitle } from "@/lib/interventions";
import { householdSchema } from "@/lib/types";

const MAX_BODY_BYTES = 8192;

const askRequestSchema = z.object({
  question: z.string().min(2).max(500),
  household: householdSchema,
  locale: z.enum(["en", "hi"]).default("en"),
});

/** Question-answering endpoint grounded exclusively in the household's computed exposure plan. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: askRequestSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid ask request. Question must be 2-500 characters with a valid household model.",
  });
  if (guarded instanceof Response) return guarded;

  try {
    const { question, household, locale } = guarded.data;

    const { byHour } = await loadTodayForecast(getAirProvider(), household.location);
    const computedPlan = buildPlan(household, byHour);

    const result = await askQuestion(question, computedPlan, household, locale);
    const citations = result.citedInterventionIds.map((id) => getInterventionTitle(id));

    return NextResponse.json({ ...result, citations }, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
