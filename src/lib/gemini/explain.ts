import { z } from "zod";
import type { Plan, RankedIntervention } from "../interventions/rank";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { groundText } from "./grounding";

/** Explanation details generated for a specific ranked intervention. */
export const explainedInterventionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(80),
  whyItHelps: z.string().min(1).max(300),
  steps: z.array(z.string().min(1).max(200)).min(2).max(4),
  sustainableAlternative: z.string().max(300).optional(),
});
export type ExplainedIntervention = z.infer<typeof explainedInterventionSchema>;

/** Response schema containing explanations for all ranked interventions in a plan. */
export const explainPlanResponseSchema = z.object({
  explanations: z.array(explainedInterventionSchema),
});
export type ExplainPlanResponse = z.infer<typeof explainPlanResponseSchema>;

/** Constrained decoding schema for Gemini plan explanation operations. */
export const explainResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    explanations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          whyItHelps: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
          sustainableAlternative: { type: "string" },
        },
        required: ["id", "title", "whyItHelps", "steps"],
      },
    },
  },
  required: ["explanations"],
};

/** Version tag for prompt template to invalidate plan cache when prompt structure evolves. */
export const EXPLAIN_PROMPT_VERSION = "v1";

/**
 * Builds deterministic explanations for demo mode, perfectly grounded in plan numbers.
 */
export function getDemoExplainFixture(plan: Plan): ExplainPlanResponse {
  const explanations: ExplainedIntervention[] = plan.ranked.map((item: RankedIntervention) => {
    const savedUg = Math.round(item.savedMicrograms);
    const savedPct = Math.round(item.savedPercent);

    return {
      id: item.id,
      title: item.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      whyItHelps: `Reduces household daily inhaled PM2.5 by ${savedUg} µg (${savedPct}% overall reduction).`,
      steps: [
        "Review high-exposure hours and ensure family members coordinate timing.",
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
Given an ALREADY-COMPUTED intervention ranking plan, produce practical household explanations.
Requirements:
1. For each ranked intervention, output:
   - title: short plain-language title (2-6 words)
   - whyItHelps: one sentence explaining why this helps this household
   - steps: 2 or 3 practical actionable steps
   - sustainableAlternative: if reducesOwnEmissions is true, note on sustainable alternative
2. STRICT NUMBER GROUNDING:
   - Do NOT invent, change, or re-calculate any numbers.
   - Use ONLY numbers provided in the input plan. Any sentence with an invented number is automatically purged.`;

/**
 * Generates plain-language, grounded explanations for all interventions in a computed Plan.
 * Executes exactly ONE Gemini call for the entire plan and grounds all resulting text.
 */
export async function explainPlan(plan: Plan, household: Household): Promise<Record<string, ExplainedIntervention>> {
  if (plan.ranked.length === 0) return {};

  const inputSummary = {
    household: {
      membersCount: household.members.length,
      cookingFuel: household.home.cookingFuel,
      windowHabit: household.home.windowHabit,
      sensitivities: household.members.flatMap((m) => m.sensitivities),
    },
    baselineTotalUg: Math.round(plan.baselineTotal),
    rankedInterventions: plan.ranked.map((item) => ({
      id: item.id,
      kind: item.kind,
      effort: item.effort,
      reducesOwnEmissions: item.reducesOwnEmissions,
      savedMicrograms: Math.round(item.savedMicrograms),
      savedPercent: Math.round(item.savedPercent),
      beneficiaries: item.beneficiaries.map((b) => ({
        memberId: b.memberId,
        savedUg: Math.round(b.savedMicrograms),
        savedPercent: Math.round(b.savedPercent),
      })),
    })),
  };

  const response = await generateStructured<ExplainPlanResponse>({
    system: EXPLAIN_SYSTEM_PROMPT,
    contents: `Explain these computed plan interventions:\n${JSON.stringify(inputSummary, null, 2)}`,
    responseSchema: explainResponseSchema,
    zodSchema: explainPlanResponseSchema,
    demoFixture: () => getDemoExplainFixture(plan),
  });

  const resultMap: Record<string, ExplainedIntervention> = {};

  for (const exp of response.explanations) {
    const groundedWhy = groundText(exp.whyItHelps, plan);
    const groundedSteps = exp.steps.map((st) => groundText(st, plan)).filter((st) => st.length > 0);
    const groundedAlt = exp.sustainableAlternative ? groundText(exp.sustainableAlternative, plan) : undefined;

    resultMap[exp.id] = {
      id: exp.id,
      title: exp.title,
      whyItHelps: groundedWhy.length > 0 ? groundedWhy : exp.whyItHelps,
      steps: groundedSteps.length > 0 ? groundedSteps : exp.steps,
      sustainableAlternative: groundedAlt,
    };
  }

  return resultMap;
}
