import { z } from "zod";
import type { Plan } from "../interventions/rank";
import { guardUserInput, INJECTION_GUARD_SYSTEM_INSTRUCTION } from "../security/injection-guard";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { groundText } from "./grounding";

/** Schema validating the structured answer to a user question regarding their plan. */
export const askResultSchema = z.object({
  answer: z.string().min(1),
  citedInterventionIds: z.array(z.string()),
  answerable: z.boolean(),
});
export type AskResult = z.infer<typeof askResultSchema>;

/** Constrained decoding schema for Gemini Q&A operations. */
export const askResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citedInterventionIds: { type: "array", items: { type: "string" } },
    answerable: { type: "boolean" },
  },
  required: ["answer", "citedInterventionIds", "answerable"],
};

/**
 * Deterministic Q&A fixture for demo mode.
 * Distinguishes between grounded exposure plan queries and off-plan topics.
 */
export function getDemoAskFixture(question: string, plan: Plan): AskResult {
  const lower = question.toLowerCase();

  const isMaskQuery = lower.includes("mask");
  const isOffPlan =
    lower.includes("france") ||
    lower.includes("weather") ||
    lower.includes("stock") ||
    lower.includes("capital") ||
    lower.includes("ice cream") ||
    lower.includes("recipe") ||
    lower.includes("car");

  if (isOffPlan) {
    return {
      answer: "This question cannot be answered from your household's air-quality exposure plan.",
      citedInterventionIds: [],
      answerable: false,
    };
  }

  const maskIntervention = plan.ranked.find((r) => r.id.includes("mask"));

  if (isMaskQuery && maskIntervention) {
    const saved = Math.round(maskIntervention.savedMicrograms);
    return {
      answer: `Yes, using a mask during outdoor exposure reduces inhaled PM2.5 by ${saved} µg for your household.`,
      citedInterventionIds: [maskIntervention.id],
      answerable: true,
    };
  }

  const topIntervention = plan.ranked[0];
  if (topIntervention) {
    const saved = Math.round(topIntervention.savedMicrograms);
    return {
      answer: `Based on your household's plan, the highest priority action reduces exposure by ${saved} µg.`,
      citedInterventionIds: [topIntervention.id],
      answerable: true,
    };
  }

  return {
    answer: "Your plan currently has no active intervention recommendations to answer this query.",
    citedInterventionIds: [],
    answerable: false,
  };
}

const ASK_SYSTEM_PROMPT = `You are Saans Household Exposure Advisor.
Answer user questions using ONLY the provided computed household plan and baseline exposures.
Rules:
1. If the question relates to the household's exposures, interventions, or schedule, answer clearly and concisely citing the relevant intervention ID(s).
2. If the plan DOES NOT contain the answer, or if the question is off-topic (e.g. general trivia, unrelated medical advice, non-plan topics), set answerable=false, citedInterventionIds=[], and state plainly that this cannot be answered from the plan.
3. STRICT NUMBER GROUNDING: Do NOT invent, extrapolate, or alter any numbers. Any sentence with an ungrounded number is automatically deleted.
${INJECTION_GUARD_SYSTEM_INSTRUCTION}`;

/**
 * Answers a user query strictly using the household's computed exposure plan.
 * Returns cited intervention IDs and enforces sentence-level numeric grounding.
 */
export async function askQuestion(question: string, plan: Plan, household: Household): Promise<AskResult> {
  const guardedQuestion = guardUserInput(question);

  const planContext = {
    baselineTotalUg: Math.round(plan.baselineTotal),
    members: household.members.map((m) => ({ id: m.id, label: m.label, sensitivities: m.sensitivities })),
    rankedInterventions: plan.ranked.map((r) => ({
      id: r.id,
      kind: r.kind,
      savedUg: Math.round(r.savedMicrograms),
      savedPercent: Math.round(r.savedPercent),
      beneficiaries: r.beneficiaries.map((b) => b.memberId),
    })),
  };

  const response = await generateStructured<AskResult>({
    system: ASK_SYSTEM_PROMPT,
    contents: `Computed Plan Context:\n${JSON.stringify(planContext, null, 2)}\n\nUser Question:\n${guardedQuestion}`,
    responseSchema: askResponseSchema,
    zodSchema: askResultSchema,
    demoFixture: () => getDemoAskFixture(question, plan),
  });

  const groundedAnswer = groundText(response.answer, plan);

  return {
    answer:
      groundedAnswer.length > 0
        ? groundedAnswer
        : "This question cannot be answered from your household's air-quality exposure plan.",
    citedInterventionIds: response.citedInterventionIds,
    answerable: response.answerable,
  };
}
