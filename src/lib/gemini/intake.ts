import { z } from "zod";
import { guardUserInput } from "../security/injection-guard";
import { householdSchema, type Location } from "../types";
import { generateStructured } from "./client";
import {
  buildConsistentAssumptions,
  getDemoIntakeFixture,
  INTAKE_SYSTEM_PROMPT,
  intakeGeminiOutputSchema,
  intakeResponseSchema,
  type IntakeGeminiOutput,
} from "./intake-prompt";
import { validateAndRepairMembers } from "./intake-repair";

export {
  buildConsistentAssumptions,
  getDemoIntakeFixture,
  INTAKE_SYSTEM_PROMPT,
  intakeGeminiOutputSchema,
  intakeResponseSchema,
};

/** Schema for intake results containing parsed household and explicit assumed field list. */
export const intakeResultSchema = z.object({
  household: householdSchema,
  assumed: z.array(z.string()).min(1),
});
export type IntakeResult = z.infer<typeof intakeResultSchema>;

/** Parses freeform user text into a validated Household model with location provided externally. */
export async function intakeHousehold(rawText: string, location: Location): Promise<IntakeResult> {
  const guardedText = guardUserInput(rawText);
  const output = await generateStructured<IntakeGeminiOutput>({
    system: INTAKE_SYSTEM_PROMPT,
    contents: `Parse this household description into structured members and home JSON:\n${guardedText}`,
    responseSchema: intakeResponseSchema,
    zodSchema: intakeGeminiOutputSchema,
    demoFixture: () => {
      const fixture = getDemoIntakeFixture(location);
      return { members: fixture.household.members, home: fixture.household.home };
    },
  });

  const { members, repairs } = await validateAndRepairMembers(output.members);
  const assumed = buildConsistentAssumptions(rawText, output.home, repairs);
  return { household: { members, home: output.home, location }, assumed };
}
