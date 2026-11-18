import { z } from "zod";
import type { Plan, RankedIntervention } from "../interventions/rank";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { getInterventionTitle, groundText, stripInternalIds } from "./grounding";

/** Explanation details generated for a specific ranked intervention. */
export const explainedInterventionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(80),
  whyItHelps: z.string().min(1).max(300),
  steps: z.array(z.string().min(1).max(200)).min(2).max(4),
  sustainableAlternative: z.string().max(300).optional(),
});
export type ExplainedIntervention = z.infer<typeof explainedInterventionSchema>;

const geminiExplanationSchema = z.object({
  index: z.number().int().min(1),
  title: z.string().min(1).max(80),
  whyItHelps: z.string().min(1).max(300),
  steps: z.array(z.string().min(1).max(200)).min(2).max(4),
  sustainableAlternative: z.string().max(300).optional(),
});

export const explainPlanResponseSchema = z.object({
  explanations: z.array(geminiExplanationSchema),
});
export type ExplainPlanResponse = z.infer<typeof explainPlanResponseSchema>;

export const explainResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    explanations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          title: { type: "string" },
          whyItHelps: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
          sustainableAlternative: { type: "string" },
        },
        required: ["index", "title", "whyItHelps", "steps"],
      },
    },
  },
  required: ["explanations"],
};

export const EXPLAIN_PROMPT_VERSION = "v2";

/** Builds deterministic explanations for demo mode, perfectly grounded in plan numbers. */
export function getDemoExplainFixture(plan: Plan, household: Household): ExplainPlanResponse {
  const memberMap = new Map(household.members.map((m) => [m.id, m.label]));

  const explanations = plan.ranked.map((item: RankedIntervention, idx: number) => {
    const savedUg = Math.round(item.savedMicrograms);
    const savedPct = Math.round(item.savedPercent);
    const primaryBen = item.beneficiaries[0];
    const benLabel = primaryBen ? memberMap.get(primaryBen.memberId) ?? "household members" : "household members";

    return {
      index: idx + 1,
      title: getInterventionTitle(item.id),
      whyItHelps: `Reduces inhaled PM2.5 by ${savedUg} µg (${savedPct}%) protecting ${benLabel}.`,
      steps: [
        "Coordinate high-exposure hours and ensure family members adjust routines.",
        "Keep doors and windows sealed when outdoor pollution levels peak.",
      ],
      sustainableAlternative: item.reducesOwnEmissions
        ? "Switching to cleaner electric alternatives eliminates direct domestic emissions."
        : undefined,
    };
  });

  return { explanations };
}

const EXPLAIN_SYSTEM_PROMPT = `You are Saans Exposure Engine Plan Explainer.
Given an ALREADY-COMPUTED plan, generate plain-language explanations using human titles and member labels.
Rules:
1. Refer to people by their human labels (e.g. "Mother", "You"). NEVER use internal IDs like "member-1" or snake_case IDs.
2. STRICT NUMBER GROUNDING: Do NOT invent, recalculate, or alter any numbers.`;

/** Generates plain-language, grounded explanations without exposing internal database or model IDs. */
export async function explainPlan(plan: Plan, household: Household): Promise<Record<string, ExplainedIntervention>> {
  if (plan.ranked.length === 0) return {};

  const memberIdToLabel = new Map(household.members.map((m) => [m.id, m.label]));
  const interventionIdToTitle = new Map(plan.ranked.map((r) => [r.id, getInterventionTitle(r.id)]));

  const inputSummary = {
    household: {
      members: household.members.map((m) => ({ label: m.label, conditions: m.sensitivities })),
      cookingFuel: household.home.cookingFuel,
      windowHabit: household.home.windowHabit,
    },
    baselineTotalUg: Math.round(plan.baselineTotal),
    rankedActions: plan.ranked.map((item, idx) => ({
      index: idx + 1,
      title: getInterventionTitle(item.id),
      effort: item.effort,
      savedMicrograms: Math.round(item.savedMicrograms),
      savedPercent: Math.round(item.savedPercent),
      beneficiaries: item.beneficiaries.map((b) => ({
        person: memberIdToLabel.get(b.memberId) ?? "Family Member",
        savedUg: Math.round(b.savedMicrograms),
      })),
    })),
  };

  const response = await generateStructured<ExplainPlanResponse>({
    system: EXPLAIN_SYSTEM_PROMPT,
    contents: `Explain these computed plan actions:\n${JSON.stringify(inputSummary, null, 2)}`,
    responseSchema: explainResponseSchema,
    zodSchema: explainPlanResponseSchema,
    demoFixture: () => getDemoExplainFixture(plan, household),
  });

  const resultMap: Record<string, ExplainedIntervention> = {};

  for (let i = 0; i < plan.ranked.length; i++) {
    const item = plan.ranked[i];
    if (!item) continue;
    const exp = response.explanations.find((e) => e.index === i + 1) ?? response.explanations[i];

    const rawWhy = exp?.whyItHelps ?? `Saves ${Math.round(item.savedMicrograms)} µg daily.`;
    const cleanWhy = stripInternalIds(rawWhy, memberIdToLabel, interventionIdToTitle);
    const groundedWhy = groundText(cleanWhy, plan);

    const cleanSteps = (exp?.steps ?? ["Review daily schedule.", "Follow air quality advisories."]).map((st) => {
      const stripped = stripInternalIds(st, memberIdToLabel, interventionIdToTitle);
      return groundText(stripped, plan);
    }).filter((s) => s.length > 0);

    const cleanAlt = exp?.sustainableAlternative
      ? groundText(stripInternalIds(exp.sustainableAlternative, memberIdToLabel, interventionIdToTitle), plan)
      : undefined;

    resultMap[item.id] = {
      id: item.id,
      title: exp?.title ?? getInterventionTitle(item.id),
      whyItHelps: groundedWhy.length > 0 ? groundedWhy : cleanWhy,
      steps: cleanSteps.length >= 2 ? cleanSteps : ["Adjust daily schedule accordingly.", "Follow local air quality advisories."],
      sustainableAlternative: cleanAlt,
    };
  }

  return resultMap;
}
