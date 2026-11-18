import { NextResponse } from "next/server";
import { z } from "zod";
import { getAirProvider } from "@/lib/air";
import { buildTodayForecast, getLocationCurrentHour } from "@/lib/air/mapper";
import { hashPlanKey, planCache } from "@/lib/cache";
import { isDemoMode } from "@/lib/env";
import { validateSchedule } from "@/lib/exposure/schedule";
import { geminiMetrics } from "@/lib/gemini/client";
import { explainPlan, EXPLAIN_PROMPT_VERSION } from "@/lib/gemini/explain";
import { buildPlan } from "@/lib/interventions/rank";
import { toSafeError } from "@/lib/security/errors";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { householdSchema, type DayForecast } from "@/lib/types";

const MAX_BODY_BYTES = 8192;

const planRequestSchema = z.object({
  household: householdSchema,
});

/**
 * Plan computation and explanation endpoint.
 * Fetches today's hourly air quality, calculates personalized physical dose reductions,
 * generates grounded plain-language explanations with Gemini (or demo fixtures),
 * and caches results by household configuration, date, and local hour.
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

    const parseResult = planRequestSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid household model provided in request body." },
        { status: 400 },
      );
    }

    const { household } = parseResult.data;

    for (const member of household.members) {
      const scheduleProblems = validateSchedule(member.windows);
      if (scheduleProblems.length > 0) {
        return NextResponse.json(
          { error: `Invalid schedule for member "${member.label}": ${scheduleProblems.join("; ")}` },
          { status: 400 },
        );
      }
    }

    const localHour = getLocationCurrentHour("in");
    const dateStr = new Date().toISOString().slice(0, 10);
    const cacheKey = hashPlanKey(household, dateStr, localHour, EXPLAIN_PROMPT_VERSION);

    const cached = planCache.get(cacheKey);
    if (cached) {
      geminiMetrics.cacheHits += 1;
      return NextResponse.json(cached, { status: 200 });
    }

    geminiMetrics.cacheMisses += 1;

    const provider = getAirProvider();
    const current = await provider.current(household.location);
    const rawForecast = await provider.forecast(household.location, 24);
    const forecast = buildTodayForecast(current, rawForecast);

    const dayForecastMap: DayForecast = new Map(forecast.map((f) => [f.hour, f.pm25]));
    const computedPlan = buildPlan(household, dayForecastMap);

    const explanations = await explainPlan(computedPlan, household);

    const rankedWithExplanations = computedPlan.ranked.map((item) => ({
      ...item,
      explanation: explanations[item.id],
    }));

    const responseData = {
      baselineTotal: computedPlan.baselineTotal,
      baseline: computedPlan.baseline,
      ranked: rankedWithExplanations,
      air: { current, forecast },
      demoMode: isDemoMode(),
    };

    planCache.set(cacheKey, responseData);

    return NextResponse.json(responseData, { status: 200 });
  } catch (err: unknown) {
    const safeError = toSafeError(err);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
