import { z } from "zod";
import { fillScheduleGaps, getDefaultScheduleForAgeBand, validateSchedule } from "../exposure";
import { householdMemberSchema, type HouseholdMember } from "../types";
import { generateStructured } from "./client";
import { normalizeMemberLabel } from "./grounding";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";

type Windows = HouseholdMember["windows"];

/** Asks the model once to fix a broken schedule; undefined when the call fails or its fix is still invalid. */
async function requestScheduleFix(label: string, problems: readonly string[]): Promise<Windows | undefined> {
  const prompt = `Schedule for member "${label}" had errors:\n${problems.join("\n")}\nFix the schedule for "${label}" with valid non-overlapping windows (max 1440m).`;
  try {
    const output = await generateStructured<{ windows: Windows }>({
      system: INTAKE_SYSTEM_PROMPT,
      contents: prompt,
      zodSchema: z.object({ windows: householdMemberSchema.shape.windows }),
    });
    return validateSchedule(output.windows).length === 0 ? output.windows : undefined;
  } catch {
    // A failed repair call is not an error to report; the deterministic default schedule takes over.
    return undefined;
  }
}

/** Repairs one member's day: model fix first, then a standard schedule, then filling uncovered time. */
async function repairMember(member: HouseholdMember): Promise<{ member: HouseholdMember; repairs: string[] }> {
  const label = normalizeMemberLabel(member.label);
  const repairs: string[] = [];
  let windows = member.windows;

  const problems = validateSchedule(windows);
  if (problems.length > 0) {
    const fixed = await requestScheduleFix(label, problems);
    if (fixed) {
      windows = fixed;
    } else {
      const commute = windows.find((block) => block.activity.startsWith("commute_"));
      windows = getDefaultScheduleForAgeBand(member.ageBand, commute);
      repairs.push(`Filled in a standard 24-hour non-overlapping schedule for ${label}.`);
    }
  }

  const filled = fillScheduleGaps(windows);
  const isUsable = validateSchedule(filled.windows).length === 0;
  const finalWindows = isUsable ? filled.windows : getDefaultScheduleForAgeBand(member.ageBand);
  const filledMinutes = isUsable ? filled.filledMinutes : 0;
  if (filledMinutes > 0) {
    repairs.push(`Filled ${filledMinutes} minutes of uncovered routine with indoor rest for ${label}.`);
  }

  return { member: { ...member, label, windows: finalWindows }, repairs };
}

/** Validates member schedules and repairs overlaps, duration violations, or unassigned time gaps. */
export async function validateAndRepairMembers(
  members: HouseholdMember[],
): Promise<{ members: HouseholdMember[]; repairs: string[] }> {
  const repaired: HouseholdMember[] = [];
  const repairs: string[] = [];
  // One member at a time, so model calls happen in household order.
  for (const member of members) {
    const result = await repairMember(member);
    repaired.push(result.member);
    repairs.push(...result.repairs);
  }
  return { members: repaired, repairs };
}
