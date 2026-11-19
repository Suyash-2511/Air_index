import { z } from "zod";
import type { Locale } from "../i18n";
import type { Plan } from "../interventions";
import { guardUserInput, INJECTION_GUARD_SYSTEM_INSTRUCTION } from "../security";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { getInterventionTitle, groundText, stripInternalIds } from "./grounding";

/** Structured answer to a question about the plan, with ids of the changes it relies on. */
interface AskResult {
  answer: string;
  citedInterventionIds: string[];
  answerable: boolean;
}

const askResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citedInterventions: { type: "array", items: { type: "string" } },
    answerable: { type: "boolean" },
  },
  required: ["answer", "citedInterventions", "answerable"],
};

/** What the model returns: titles of the changes it relied on, which are mapped back to ids afterwards. */
const geminiAnswerSchema = z.object({
  answer: z.string(),
  citedInterventions: z.array(z.string()),
  answerable: z.boolean(),
});
type GeminiAnswer = z.infer<typeof geminiAnswerSchema>;

/** Everything one question needs, passed together so helpers stay within four parameters. */
interface AskRequest {
  question: string;
  plan: Plan;
  household: Household;
  locale: Locale;
}

/** Topics the plan cannot speak to; the demo answer declines them. */
const OFF_PLAN_KEYWORDS = ["france", "weather", "stock", "capital", "recipe", "cake", "car"];

const DEMO_ANSWERS = {
  offPlan: {
    en: "This question cannot be answered from your household's air-quality exposure plan.",
    hi: "यह प्रश्न आपके परिवार की वायु-गुणवत्ता योजना से संबंधित नहीं है।",
  },
  motherStaysIndoors: {
    en: "The plan does not recommend a mask for Mother because her daily schedule is entirely indoors; outdoor mask protection is recommended for family members who commute.",
    hi: "योजना में माँ के लिए मास्क की सिफारिश नहीं की गई है क्योंकि वे पूरे दिन घर के अंदर रहती हैं; यात्रा करने वाले सदस्यों के लिए बाहरी मास्क की सिफारिश की जाती है।",
  },
  maskHelps: {
    en: "Yes, using a mask during outdoor exposure reduces inhaled PM2.5 significantly.",
    hi: "हाँ, बाहर जाने पर मास्क लगाने से PM2.5 कणों की मात्रा में काफी कमी आती है।",
  },
  noChanges: {
    en: "Your plan currently has no active intervention recommendations to answer this query.",
    hi: "इस प्रश्न का उत्तर देने के लिए आपकी योजना में कोई सक्रिय उपाय नहीं है।",
  },
} as const;

/** Mask advice depends on whether Mother ever goes outside, which is the case the demo is built around. */
function demoMaskAnswer(household: Household, locale: Locale): string {
  const mother = household.members.find((member) => member.label.toLowerCase().includes("mother"));
  const staysIndoors = mother ? mother.windows.every((block) => block.setting === "indoor") : false;
  return (staysIndoors ? DEMO_ANSWERS.motherStaysIndoors : DEMO_ANSWERS.maskHelps)[locale];
}

/** Falls back to naming the highest-impact change, or says there is none. */
function demoTopChangeAnswer(plan: Plan, locale: Locale): AskResult {
  const top = plan.ranked[0];
  if (!top) return { answer: DEMO_ANSWERS.noChanges[locale], citedInterventionIds: [], answerable: false };
  const title = getInterventionTitle(top.id);
  const answer =
    locale === "hi"
      ? `आपके परिवार की योजना के अनुसार, ${title} सबसे प्रभावशाली उपाय है।`
      : `Based on your household's plan, ${title} is your highest-impact recommendation.`;
  return { answer, citedInterventionIds: [top.id], answerable: true };
}

/** Deterministic Q&A fixture for demo mode. */
export function getDemoAskFixture(question: string, plan: Plan, household: Household, locale: Locale = "en"): AskResult {
  const lower = question.toLowerCase();
  if (OFF_PLAN_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return { answer: DEMO_ANSWERS.offPlan[locale], citedInterventionIds: [], answerable: false };
  }

  const maskChange = plan.ranked.find((change) => change.id.includes("mask"));
  if (lower.includes("mask") && maskChange) {
    return { answer: demoMaskAnswer(household, locale), citedInterventionIds: [maskChange.id], answerable: true };
  }
  return demoTopChangeAnswer(plan, locale);
}

const ASK_SYSTEM_PROMPT = `You are Saans Household Exposure Advisor.
Answer user questions using ONLY the provided household plan and daily schedules.
Rules:
1. Refer to family members by their human labels (e.g. "Mother", "You"). NEVER output internal IDs like "member-1" or snake_case IDs.
2. ANSWERABILITY: A question about a member or intervention that exists in the plan is ANSWERABLE (answerable=true), even if the answer is "this does not apply to her because she is indoors all day". Cite the relevant intervention title.
3. Only mark answerable=false when the question is genuinely off-plan (e.g. general trivia, unrelated medical diagnosis, geography).
4. STRICT NUMBER GROUNDING: Do NOT invent, recalculate, or alter any numbers.
${INJECTION_GUARD_SYSTEM_INSTRUCTION}`;

/** The plan as the model sees it: human labels and rounded numbers, never internal ids. */
function buildPlanContext({ plan, household }: AskRequest, memberLabels: ReadonlyMap<string, string>) {
  return {
    baselineTotalUg: Math.round(plan.baselineTotal),
    members: household.members.map((member) => ({
      person: member.label,
      sensitivities: member.sensitivities,
      scheduleSummary: member.windows.map((block) => `${block.activity} (${block.setting}, ${block.startHour}:00 for ${block.durationMinutes}m)`),
    })),
    rankedInterventions: plan.ranked.map((change) => ({
      title: getInterventionTitle(change.id),
      savedUg: Math.round(change.savedMicrograms),
      savedPercent: Math.round(change.savedPercent),
      beneficiaries: change.beneficiaries.map((beneficiary) => memberLabels.get(beneficiary.memberId) ?? "Family Member"),
    })),
  };
}

/** Sends the guarded question and plan context to the model, or serves the demo answer in the same shape. */
function requestAnswer(request: AskRequest, memberLabels: ReadonlyMap<string, string>): Promise<GeminiAnswer> {
  const systemPrompt =
    request.locale === "hi"
      ? `${ASK_SYSTEM_PROMPT}\n5. Language: Hindi (Devanagari script). Provide the answer in natural Hindi.`
      : ASK_SYSTEM_PROMPT;

  return generateStructured<GeminiAnswer>({
    system: systemPrompt,
    contents: `Computed Plan Context:\n${JSON.stringify(buildPlanContext(request, memberLabels), null, 2)}\n\nUser Question:\n${guardUserInput(request.question)}`,
    responseSchema: askResponseSchema,
    zodSchema: geminiAnswerSchema,
    demoFixture: () => {
      const demo = getDemoAskFixture(request.question, request.plan, request.household, request.locale);
      return {
        answer: demo.answer,
        citedInterventions: demo.citedInterventionIds.map((id) => getInterventionTitle(id)),
        answerable: demo.answerable,
      };
    },
  });
}

/** Maps the titles the model cited back to change ids; a question about masks always cites the mask change. */
function resolveCitedIds(request: AskRequest, citedTitles: readonly string[]): string[] {
  const idByTitle = new Map(request.plan.ranked.map((change) => [getInterventionTitle(change.id).toLowerCase(), change.id]));
  const cited = new Set<string>();
  for (const title of citedTitles) {
    const id = idByTitle.get(title.toLowerCase().trim());
    if (id) cited.add(id);
  }

  if (request.question.toLowerCase().includes("mask")) {
    const maskChange = request.plan.ranked.find((change) => change.id.includes("mask"));
    if (maskChange) cited.add(maskChange.id);
  }
  return Array.from(cited);
}

/** Answers a user query strictly using the household's computed exposure plan without exposing internal IDs. */
export async function askQuestion(
  question: string,
  plan: Plan,
  household: Household,
  locale: Locale = "en",
): Promise<AskResult> {
  const request: AskRequest = { question, plan, household, locale };
  const memberLabels = new Map(household.members.map((member) => [member.id, member.label]));
  const titlesById = new Map(plan.ranked.map((change) => [change.id, getInterventionTitle(change.id)]));

  const response = await requestAnswer(request, memberLabels);
  const cleanAnswer = stripInternalIds(response.answer, memberLabels, titlesById);
  const groundedAnswer = groundText(cleanAnswer, plan);

  return {
    answer: groundedAnswer.length > 0 ? groundedAnswer : cleanAnswer,
    citedInterventionIds: resolveCitedIds(request, response.citedInterventions),
    answerable: response.answerable,
  };
}
