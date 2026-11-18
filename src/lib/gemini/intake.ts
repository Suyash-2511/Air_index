import { z } from "zod";
import { guardUserInput, INJECTION_GUARD_SYSTEM_INSTRUCTION } from "../security/injection-guard";
import { householdSchema, type Household } from "../types";
import { generateStructured } from "./client";

/** Schema for intake results containing parsed household and explicit assumed field list. */
export const intakeResultSchema = z.object({
  household: householdSchema,
  assumed: z.array(z.string()).min(1),
});

export type IntakeResult = z.infer<typeof intakeResultSchema>;

/**
 * Deterministic intake fixture for demo mode or offline execution.
 * Faithfully represents common Indian urban household profiles without LLM invocation.
 */
export function getDemoIntakeFixture(): IntakeResult {
  const household: Household = {
    members: [
      {
        id: "member-user",
        label: "User",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 480, room: "living", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 17, durationMinutes: 420, room: "living", mask: false },
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
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: {
      lat: 28.6139,
      lng: 77.209,
      label: "New Delhi",
    },
  };

  return {
    household,
    assumed: [
      "Location defaulted to New Delhi (lat: 28.6139, lng: 77.2090)",
      "Mother's age band assumed as older_adult",
      "No home air purifier installed",
      "No kitchen exhaust fan installed",
      "No indoor tobacco smoking",
      "Standard indoor rest and sleep schedules for unmentioned hours",
    ],
  };
}

const INTAKE_SYSTEM_PROMPT = `You are Saans Household Intake Assistant.
Transform freeform user household text into a structured Household model matching the schema.
Rules:
1. NEVER invent family members or health conditions not mentioned in user text.
2. For any field not mentioned (e.g. location, sleep hours, purifier, exhaust fan, indoor smoking), apply sensible defaults AND add a clear human-readable string to the "assumed" array explaining what was defaulted (e.g. "We assumed no air purifier").
3. Ensure every member has at least one activity window covering 24 hours of their day.
4. If location is omitted, default to New Delhi (lat 28.6139, lng 77.2090).
${INJECTION_GUARD_SYSTEM_INSTRUCTION}`;

/** Constrained decoding response schema for Gemini intake operations. */
export const intakeResponseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    household: {
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
                    activity: { type: "string", enum: ["sleep", "rest_indoor", "light_indoor", "cooking", "commute_vehicle", "commute_walk", "commute_cycle", "outdoor_work", "outdoor_exercise", "outdoor_play"] },
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
        location: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            label: { type: "string" },
          },
          required: ["lat", "lng", "label"],
        },
      },
      required: ["members", "home", "location"],
    },
    assumed: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["household", "assumed"],
};

/**
 * Parses freeform natural language user text into a validated Household model.
 * Identifies explicit attributes, applies defaults, and reports all assumed fields.
 */
export async function intakeHousehold(rawText: string): Promise<IntakeResult> {
  const guardedText = guardUserInput(rawText);

  return generateStructured<IntakeResult>({
    system: INTAKE_SYSTEM_PROMPT,
    contents: `Parse this household description into structured Household JSON:\n${guardedText}`,
    responseSchema: intakeResponseSchema,
    zodSchema: intakeResultSchema,
    demoFixture: getDemoIntakeFixture,
  });
}
