import { z } from "zod";
import type { Plan } from "../interventions/rank";
import { guardUserInput, INJECTION_GUARD_SYSTEM_INSTRUCTION } from "../security/injection-guard";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { getInterventionTitle, groundText, stripInternalIds } from "./grounding";

/** Schema validating the structured answer to a user question regarding their plan. */
export const askResultSchema = z.object({
  answer: z.string().min(1),
  citedInterventionIds: z.array(z.string()),
  answerable: z.boolean(),
});
export type AskResult = z.infer<typeof askResultSchema>;

export const askResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citedInterventions: { type: "array", items: { type: "string" } },
    answerable: { type: "boolean" },
  },
  required: ["answer", "citedInterventions", "answerable"],
};

/** Deterministic Q&A fixture for demo mode. */
export function getDemoAskFixture(
  question: string,
  plan: Plan,
  household: Household,
  locale: "en" | "hi" = "en",
): AskResult {
  const isHi = locale === "hi";
  const lower = question.toLowerCase();

  const isOffPlan =
    lower.includes("france") ||
    lower.includes("weather") ||
    lower.includes("stock") ||
    lower.includes("capital") ||
    lower.includes("recipe") ||
    lower.includes("cake") ||
    lower.includes("car");

  if (isOffPlan) {
    return {
      answer: isHi
        ? "यह प्रश्न आपके परिवार की वायु-गुणवत्ता योजना से संबंधित नहीं है।"
        : "This question cannot be answered from your household's air-quality exposure plan.",
      citedInterventionIds: [],
      answerable: false,
    };
  }

  const maskIntervention = plan.ranked.find((r) => r.id.includes("mask"));

  if (lower.includes("mask") && maskIntervention) {
    const mother = household.members.find((m) => m.label.toLowerCase().includes("mother"));
    const isMotherIndoors = mother ? mother.windows.every((w) => w.setting === "indoor") : false;

    const answer = isMotherIndoors
      ? (isHi
          ? "योजना में माँ के लिए मास्क की सिफारिश नहीं की गई है क्योंकि वे पूरे दिन घर के अंदर रहती हैं; यात्रा करने वाले सदस्यों के लिए बाहरी मास्क की सिफारिश की जाती है।"
          : "The plan does not recommend a mask for Mother because her daily schedule is entirely indoors; outdoor mask protection is recommended for family members who commute.")
      : (isHi
          ? "हाँ, बाहर जाने पर मास्क लगाने से PM2.5 कणों की मात्रा में काफी कमी आती है।"
          : "Yes, using a mask during outdoor exposure reduces inhaled PM2.5 significantly.");

    return {
      answer,
      citedInterventionIds: [maskIntervention.id],
      answerable: true,
    };
  }

  const top = plan.ranked[0];
  return {
    answer: top
      ? (isHi
          ? `आपके परिवार की योजना के अनुसार, ${getInterventionTitle(top.id)} सबसे प्रभावशाली उपाय है।`
          : `Based on your household's plan, ${getInterventionTitle(top.id)} is your highest-impact recommendation.`)
      : (isHi
          ? "इस प्रश्न का उत्तर देने के लिए आपकी योजना में कोई सक्रिय उपाय नहीं है।"
          : "Your plan currently has no active intervention recommendations to answer this query."),
    citedInterventionIds: top ? [top.id] : [],
    answerable: top !== undefined,
  };
}

const ASK_SYSTEM_PROMPT = `You are Saans Household Exposure Advisor.
Answer user questions using ONLY the provided household plan and daily schedules.
Rules:
1. Refer to family members by their human labels (e.g. "Mother", "You"). NEVER output internal IDs like "member-1" or snake_case IDs.
2. ANSWERABILITY: A question about a member or intervention that exists in the plan is ANSWERABLE (answerable=true), even if the answer is "this does not apply to her because she is indoors all day". Cite the relevant intervention title.
3. Only mark answerable=false when the question is genuinely off-plan (e.g. general trivia, unrelated medical diagnosis, geography).
4. STRICT NUMBER GROUNDING: Do NOT invent, recalculate, or alter any numbers.
${INJECTION_GUARD_SYSTEM_INSTRUCTION}`;

/** Answers a user query strictly using the household's computed exposure plan without exposing internal IDs. */
export async function askQuestion(
  question: string,
  plan: Plan,
  household: Household,
  locale: "en" | "hi" = "en",
): Promise<AskResult> {
  const guardedQuestion = guardUserInput(question);

  const memberIdToLabel = new Map(household.members.map((m) => [m.id, m.label]));
  const titleToIdMap = new Map(plan.ranked.map((r) => [getInterventionTitle(r.id).toLowerCase(), r.id]));
  const idToTitleMap = new Map(plan.ranked.map((r) => [r.id, getInterventionTitle(r.id)]));

  const planContext = {
    baselineTotalUg: Math.round(plan.baselineTotal),
    members: household.members.map((m) => ({
      person: m.label,
      sensitivities: m.sensitivities,
      scheduleSummary: m.windows.map((w) => `${w.activity} (${w.setting}, ${w.startHour}:00 for ${w.durationMinutes}m)`),
    })),
    rankedInterventions: plan.ranked.map((r) => ({
      title: getInterventionTitle(r.id),
      savedUg: Math.round(r.savedMicrograms),
      savedPercent: Math.round(r.savedPercent),
      beneficiaries: r.beneficiaries.map((b) => memberIdToLabel.get(b.memberId) ?? "Family Member"),
    })),
  };

  const systemPrompt = locale === "hi"
    ? `${ASK_SYSTEM_PROMPT}\n5. Language: Hindi (Devanagari script). Provide the answer in natural Hindi.`
    : ASK_SYSTEM_PROMPT;

  const response = await generateStructured<{ answer: string; citedInterventions: string[]; answerable: boolean }>({
    system: systemPrompt,
    contents: `Computed Plan Context:\n${JSON.stringify(planContext, null, 2)}\n\nUser Question:\n${guardedQuestion}`,
    responseSchema: askResponseSchema,
    zodSchema: z.object({
      answer: z.string(),
      citedInterventions: z.array(z.string()),
      answerable: z.boolean(),
    }),
    demoFixture: () => {
      const demo = getDemoAskFixture(question, plan, household, locale);
      return {
        answer: demo.answer,
        citedInterventions: demo.citedInterventionIds.map((id) => getInterventionTitle(id)),
        answerable: demo.answerable,
      };
    },
  });

  const cleanAnswer = stripInternalIds(response.answer, memberIdToLabel, idToTitleMap);
  const groundedAnswer = groundText(cleanAnswer, plan);

  // Map cited titles back to intervention IDs
  const citedIds = new Set<string>();
  for (const cited of response.citedInterventions) {
    const matchedId = titleToIdMap.get(cited.toLowerCase().trim());
    if (matchedId) citedIds.add(matchedId);
  }

  // Fallback: if user asked about mask and answer discussed mask, cite mask intervention
  if (question.toLowerCase().includes("mask")) {
    const maskItem = plan.ranked.find((r) => r.id.includes("mask"));
    if (maskItem) citedIds.add(maskItem.id);
  }

  return {
    answer: groundedAnswer.length > 0 ? groundedAnswer : cleanAnswer,
    citedInterventionIds: Array.from(citedIds),
    answerable: response.answerable,
  };
}
