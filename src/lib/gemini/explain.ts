import { z } from "zod";
import type { Plan, RankedIntervention } from "../interventions";
import type { Locale } from "../i18n";
import type { Household } from "../types";
import { generateStructured } from "./client";
import { getInterventionTitle, groundText, stripInternalIds } from "./grounding";

/** Length limits for the model's text: enough for a plain sentence or two, short enough to read on a phone. */
const MAX_TITLE_CHARS = 80;
const MAX_EXPLANATION_CHARS = 300;
const MAX_STEP_CHARS = 200;
/** Between two and four steps: one is not a plan, and more than four are not followed. */
const MIN_STEPS = 2;
const MAX_STEPS = 4;

/** The model-written explanation text shared by the stored and the requested shapes. */
const explanationContentSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_CHARS),
  whyItHelps: z.string().min(1).max(MAX_EXPLANATION_CHARS),
  steps: z.array(z.string().min(1).max(MAX_STEP_CHARS)).min(MIN_STEPS).max(MAX_STEPS),
  sustainableAlternative: z.string().max(MAX_EXPLANATION_CHARS).optional(),
});

/** Explanation details generated for a specific ranked intervention. */
export const explainedInterventionSchema = explanationContentSchema.extend({ id: z.string() });
/** One intervention with its checked, plain-language explanation. */
export type ExplainedIntervention = z.infer<typeof explainedInterventionSchema>;

/** The model identifies each explanation by its 1-based position in the prompt, never by internal id. */
const geminiExplanationSchema = explanationContentSchema.extend({ index: z.number().int().min(1) });

/** What comes back from the model: explanations keyed by their position in the prompt. */
export const explainPlanResponseSchema = z.object({
  explanations: z.array(geminiExplanationSchema),
});
/** What comes back from the model. */
export type ExplainPlanResponse = z.infer<typeof explainPlanResponseSchema>;

/** The same shape as a JSON schema, which the model is asked to follow. */
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

/** Bumped whenever the prompt changes, so cached explanations from an older prompt are not reused. */
export const EXPLAIN_PROMPT_VERSION = "v2";

/** Builds deterministic explanations for demo mode, perfectly grounded in plan numbers. */
export function getDemoExplainFixture(
  plan: Plan,
  household: Household,
  locale: Locale = "en",
): ExplainPlanResponse {
  const isHi = locale === "hi";
  const memberMap = new Map(household.members.map((member) => [member.id, member.label]));

  const explanations = plan.ranked.map((item: RankedIntervention, idx: number) => {
    const savedUg = Math.round(item.savedMicrograms);
    const savedPct = Math.round(item.savedPercent);
    const primaryBen = item.beneficiaries[0];
    const benLabel = primaryBen ? memberMap.get(primaryBen.memberId) ?? "household members" : "household members";

    return {
      index: idx + 1,
      title: getInterventionTitle(item.id),
      whyItHelps: isHi
        ? `${benLabel} की सुरक्षा: सांस में PM2.5 को ${savedUg} µg (${savedPct}%) कम करता है।`
        : `Reduces inhaled PM2.5 by ${savedUg} µg (${savedPct}%) protecting ${benLabel}.`,
      steps: isHi
        ? [
            "प्रदूषण के चरम घंटों में अपनी दिनचर्या समायोजित करें।",
            "बाहरी प्रदूषण अधिक होने पर दरवाजे और खिड़कियां बंद रखें।",
          ]
        : [
            "Coordinate high-exposure hours and ensure family members adjust routines.",
            "Keep doors and windows sealed when outdoor pollution levels peak.",
          ],
      sustainableAlternative: item.reducesOwnEmissions
        ? (isHi
            ? "स्वच्छ इलेक्ट्रिक विकल्पों पर स्विच करने से घरेलू उत्सर्जन समाप्त होता है।"
            : "Switching to cleaner electric alternatives eliminates direct domestic emissions.")
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

/** What the model sees: names and numbers the engine already computed, never internal ids. */
function buildExplainerInput(plan: Plan, household: Household, memberLabels: ReadonlyMap<string, string>) {
  return {
    household: {
      members: household.members.map((member) => ({ label: member.label, conditions: member.sensitivities })),
      cookingFuel: household.home.cookingFuel,
      windowHabit: household.home.windowHabit,
    },
    baselineTotalUg: Math.round(plan.baselineTotal),
    rankedActions: plan.ranked.map((item, index) => ({
      index: index + 1,
      title: getInterventionTitle(item.id),
      effort: item.effort,
      savedMicrograms: Math.round(item.savedMicrograms),
      savedPercent: Math.round(item.savedPercent),
      beneficiaries: item.beneficiaries.map((beneficiary) => ({
        person: memberLabels.get(beneficiary.memberId) ?? "Family Member",
        savedUg: Math.round(beneficiary.savedMicrograms),
      })),
    })),
  };
}

/** Asks the model for explanations; any failure falls back to the deterministic ones. */
function requestExplanations(
  plan: Plan,
  household: Household,
  locale: Locale,
  memberLabels: ReadonlyMap<string, string>,
): Promise<ExplainPlanResponse> {
  const systemPrompt =
    locale === "hi"
      ? `${EXPLAIN_SYSTEM_PROMPT}
3. Language: Hindi (Devanagari script). Write all explanations and steps in natural Hindi.`
      : EXPLAIN_SYSTEM_PROMPT;

  return generateStructured<ExplainPlanResponse>({
    system: systemPrompt,
    contents: `Explain these computed plan actions:
${JSON.stringify(buildExplainerInput(plan, household, memberLabels), null, 2)}`,
    responseSchema: explainResponseSchema,
    zodSchema: explainPlanResponseSchema,
    demoFixture: () => getDemoExplainFixture(plan, household, locale),
  }).catch(() => {
    // Every number is computed without Gemini, so a failed call must not fail the plan: the
    // deterministic explanations are grounded in the same numbers.
    return getDemoExplainFixture(plan, household, locale);
  });
}

/** Used when the model's steps are missing, so every change still shows usable steps. */
const MODEL_STEPS_FALLBACK = ["Review daily schedule.", "Follow air quality advisories."];
/** Used when cleaning leaves fewer steps than the schema promises. */
const CLEANED_STEPS_FALLBACK = ["Adjust daily schedule accordingly.", "Follow local air quality advisories."];

/** Cleans model text: internal ids become human names, and every number is checked against the plan. */
interface TextCleaner {
  scrub: (text: string) => string;
  ground: (text: string) => string;
}

type ModelExplanation = ExplainPlanResponse["explanations"][number];

/** Cleans the steps, falling back to generic ones when the model sent none or cleaning left too few. */
function cleanSteps(steps: readonly string[] | undefined, cleaner: TextCleaner): string[] {
  const cleaned = (steps ?? MODEL_STEPS_FALLBACK)
    .map((step) => cleaner.ground(cleaner.scrub(step)))
    .filter((step) => step.length > 0);
  return cleaned.length >= MIN_STEPS ? cleaned : CLEANED_STEPS_FALLBACK;
}

/** Cleans the optional "greener alternative" line when the model wrote one. */
function cleanAlternative(text: string | undefined, cleaner: TextCleaner): string | undefined {
  return text ? cleaner.ground(cleaner.scrub(text)) : undefined;
}

/** Turns one model explanation into the stored shape, keeping the engine's own numbers when the model's text fails the checks. */
function buildExplanation(
  item: RankedIntervention,
  model: ModelExplanation | undefined,
  cleaner: TextCleaner,
): ExplainedIntervention {
  const cleanWhy = cleaner.scrub(model?.whyItHelps ?? `Saves ${Math.round(item.savedMicrograms)} µg daily.`);
  const groundedWhy = cleaner.ground(cleanWhy);
  return {
    id: item.id,
    title: model?.title ?? getInterventionTitle(item.id),
    whyItHelps: groundedWhy.length > 0 ? groundedWhy : cleanWhy,
    steps: cleanSteps(model?.steps, cleaner),
    sustainableAlternative: item.reducesOwnEmissions ? cleanAlternative(model?.sustainableAlternative, cleaner) : undefined,
  };
}

/** Generates plain-language, grounded explanations without exposing internal database or model IDs. */
export async function explainPlan(
  plan: Plan,
  household: Household,
  locale: Locale = "en",
): Promise<Record<string, ExplainedIntervention>> {
  if (plan.ranked.length === 0) return {};

  const memberLabels = new Map(household.members.map((member) => [member.id, member.label]));
  const interventionTitles = new Map(plan.ranked.map((item) => [item.id, getInterventionTitle(item.id)]));
  const cleaner: TextCleaner = {
    scrub: (text) => stripInternalIds(text, memberLabels, interventionTitles),
    ground: (text) => groundText(text, plan),
  };

  const { explanations } = await requestExplanations(plan, household, locale, memberLabels);
  return Object.fromEntries(
    plan.ranked.map((item, index) => {
      const model = explanations.find((entry) => entry.index === index + 1) ?? explanations[index];
      return [item.id, buildExplanation(item, model, cleaner)];
    }),
  );
}
