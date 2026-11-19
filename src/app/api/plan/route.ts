import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider, loadTodayForecast } from "@/lib/air";
import { getLocationCurrentHour } from "@/lib/air";
import { hashPlanKey, planCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { validateSchedule } from "@/lib/exposure";
import { geminiMetrics } from "@/lib/gemini";
import { explainPlan, EXPLAIN_PROMPT_VERSION } from "@/lib/gemini";
import { jsonError, parseGuardedRequest } from "@/lib/http";
import { buildPlan } from "@/lib/interventions";
import { householdSchema, type Household } from "@/lib/types";
import { HTTP_STATUS } from "@/lib/security";

const MAX_BODY_BYTES = 8192;

const planRequestSchema = z.object({
  household: householdSchema,
  locale: z.enum(["en", "hi"]).default("en"),
});

type PlanLocale = z.output<typeof planRequestSchema>["locale"];

/** Returns the first schedule error as a client-safe message, so a broken day is rejected before any cost. */
function findScheduleError(household: Household): string | undefined {
  for (const member of household.members) {
    const problems = validateSchedule(member.windows);
    if (problems.length > 0) return `Invalid schedule for member "${member.label}": ${problems.join("; ")}`;
  }
  return undefined;
}

/** Builds the plan, asks the model to explain it, and shapes the response body. */
async function computePlanResponse(household: Household, locale: PlanLocale) {
  const { current, forecast, byHour } = await loadTodayForecast(getAirProvider(), household.location);
  const plan = buildPlan(household, byHour);
  const explanations = await explainPlan(plan, household, locale);

  return {
    baselineTotal: plan.baselineTotal,
    baseline: plan.baseline,
    ranked: plan.ranked.map((item) => ({ ...item, explanation: explanations[item.id] })),
    air: { current, forecast },
    demoMode: isDemoMode(),
  };
}

/** Plan computation and explanation endpoint calculating personalized physical dose reductions. */
export async function POST(request: Request): Promise<Response> {
  const guarded = await parseGuardedRequest(request, {
    schema: planRequestSchema,
    maxBytes: MAX_BODY_BYTES,
    invalidMessage: "Invalid household model provided in request body.",
  });
  if (guarded instanceof Response) return guarded;

  const { household, locale } = guarded.data;
  const scheduleError = findScheduleError(household);
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: HTTP_STATUS.BAD_REQUEST });

  try {
    // Keyed by hour and prompt version so a stale explanation is never served after the prompt changes.
    const dateKey = new Date().toISOString().slice(0, 10);
    const cacheKey = hashPlanKey(household, dateKey, getLocationCurrentHour("in"), `${EXPLAIN_PROMPT_VERSION}-${locale}`);

    const cached = planCache.get(cacheKey);
    if (cached) {
      geminiMetrics.cacheHits += 1;
      return NextResponse.json(cached, { status: 200 });
    }
    geminiMetrics.cacheMisses += 1;

    const responseData = await computePlanResponse(household, locale);
    planCache.set(cacheKey, responseData);
    return NextResponse.json(responseData, { status: 200 });
  } catch (err: unknown) {
    return jsonError(err);
  }
}
