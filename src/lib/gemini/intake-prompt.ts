import { z } from "zod";
import { INJECTION_GUARD_SYSTEM_INSTRUCTION } from "../security/injection-guard";
import {
  homeSetupSchema,
  householdMemberSchema,
  type HomeSetup,
  type HouseholdMember,
  type Location,
} from "../types";

/** Constrained Gemini output schema containing members array and home setup. */
export const intakeGeminiOutputSchema = z.object({
  members: z.array(householdMemberSchema).min(1).max(8),
  home: homeSetupSchema,
});
export type IntakeGeminiOutput = z.infer<typeof intakeGeminiOutputSchema>;

/** Constrained decoding response schema for Gemini intake operations without location. */
export const intakeResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    members: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          ageBand: { type: "string", enum: ["infant", "child", "teen", "adult", "older_adult"] },
          sensitivities: { type: "array", items: { type: "string", enum: ["asthma", "copd", "heart_condition", "pregnancy"] } },
          windows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activity: {
                  type: "string",
                  enum: [
                    "sleep",
                    "rest_indoor",
                    "light_indoor",
                    "cooking",
                    "commute_vehicle",
                    "commute_walk",
                    "commute_cycle",
                    "outdoor_work",
                    "outdoor_exercise",
                    "outdoor_play",
                  ],
                },
                setting: { type: "string", enum: ["indoor", "outdoor", "vehicle"] },
                startHour: { type: "integer" },
                durationMinutes: { type: "integer" },
                room: { type: "string", enum: ["bedroom", "living"] },
                mask: { type: "boolean" },
              },
              required: ["activity", "setting", "startHour", "durationMinutes"],
            },
          },
        },
        required: ["id", "label", "ageBand", "sensitivities", "windows"],
      },
    },
    home: {
      type: "object",
      properties: {
        windowHabit: { type: "string", enum: ["open_often", "open_sometimes", "kept_closed"] },
        hasPurifier: { type: "boolean" },
        purifierRoom: { type: "string", enum: ["bedroom", "living"] },
        cookingFuel: { type: "string", enum: ["electric", "piped_gas", "lpg", "kerosene", "biomass"] },
        hasExhaustFan: { type: "boolean" },
        smokingIndoors: { type: "boolean" },
      },
      required: ["windowHabit", "hasPurifier", "purifierRoom", "cookingFuel", "hasExhaustFan", "smokingIndoors"],
    },
  },
  required: ["members", "home"],
};

/** System prompt instructing Gemini on structured household extraction rules. */
export const INTAKE_SYSTEM_PROMPT = `You are Saans Household Intake Assistant.
Extract members and home setup into structured JSON. NEVER invent members or health conditions.
CRITICAL: Do NOT invent activities or routines not explicitly mentioned in the text (e.g. NEVER add a cooking slot for someone not said to cook). For unmentioned daytime hours, use light_indoor or rest_indoor.
Each member's windows must cover their daily routine without exceeding 1440 minutes or overlapping.
${INJECTION_GUARD_SYSTEM_INSTRUCTION}`;

/** Builds consistent plain-language assumption notices in code from user text and defaults. */
export function buildConsistentAssumptions(text: string, home: HomeSetup, repairs: readonly string[]): string[] {
  const assumed: string[] = [];
  const lower = text.toLowerCase();
  if (!home.hasPurifier && !/purifier|filter|cleaner/i.test(lower)) assumed.push("No air purifier in the home (defaulted to none)");
  if (!home.hasExhaustFan && !/exhaust|chimney|vent/i.test(lower)) assumed.push("No kitchen exhaust fan (defaulted to none)");
  if (!home.smokingIndoors && !/smok/i.test(lower)) assumed.push("No indoor tobacco smoking (defaulted to none)");
  if (!/lpg|gas|electric|induction|wood|kerosene|biomass/i.test(lower)) assumed.push(`Cooking fuel assumed as ${home.cookingFuel.toUpperCase()}`);
  if (!/window|doors/i.test(lower)) assumed.push(`Window habits assumed as ${home.windowHabit.replace(/_/g, " ")}`);
  for (const repair of repairs) assumed.push(repair);
  if (assumed.length === 0) assumed.push("All household configurations were extracted directly from description");
  return assumed;
}

/** Deterministic intake fixture for demo mode. */
export function getDemoIntakeFixture(location: Location) {
  const members: HouseholdMember[] = [
    {
      id: "member-user",
      label: "You",
      ageBand: "adult",
      sensitivities: [],
      windows: [
        { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
        { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
        { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 900, room: "living", mask: false },
      ],
    },
    {
      id: "member-mother",
      label: "Mother",
      ageBand: "older_adult",
      sensitivities: ["asthma"],
      windows: [
        { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
        { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
      ],
    },
  ];
  return {
    household: {
      members,
      home: { windowHabit: "open_often" as const, hasPurifier: false, purifierRoom: "living" as const, cookingFuel: "lpg" as const, hasExhaustFan: false, smokingIndoors: false },
      location,
    },
    assumed: [
      "No air purifier in the home (defaulted to none)",
      "No kitchen exhaust fan (defaulted to none)",
      "No indoor tobacco smoking (defaulted to none)",
    ],
  };
}
