import { z } from "zod";
import { fillScheduleGaps, getDefaultScheduleForAgeBand, validateSchedule } from "../exposure/schedule";
import { householdMemberSchema, type HouseholdMember } from "../types";
import { generateStructured } from "./client";
import { normalizeMemberLabel } from "./grounding";
import { INTAKE_SYSTEM_PROMPT } from "./intake-prompt";

/** Validates member schedules and repairs overlaps, duration violations, or unassigned time gaps. */
export async function validateAndRepairMembers(
  members: HouseholdMember[],
): Promise<{ members: HouseholdMember[]; repairs: string[] }> {
  const repaired: HouseholdMember[] = [];
  const repairs: string[] = [];

  for (const m of members) {
    const normLabel = normalizeMemberLabel(m.label);
    let currentWindows = m.windows;
    let problems = validateSchedule(currentWindows);

    if (problems.length > 0) {
      try {
        const retryPrompt = `Schedule for member "${normLabel}" had errors:\n${problems.join("\n")}\nFix the schedule for "${normLabel}" with valid non-overlapping windows (max 1440m).`;
        const retryOutput = await generateStructured<{ windows: HouseholdMember["windows"] }>({
          system: INTAKE_SYSTEM_PROMPT,
          contents: retryPrompt,
          zodSchema: z.object({ windows: householdMemberSchema.shape.windows }),
        });
        if (validateSchedule(retryOutput.windows).length === 0) {
          currentWindows = retryOutput.windows;
          problems = [];
        }
      } catch {
        // Fall back to default repair
      }
    }

    if (problems.length > 0) {
      const commute = currentWindows.find((w) => w.activity.startsWith("commute_"));
      currentWindows = getDefaultScheduleForAgeBand(m.ageBand, commute);
      repairs.push(`Filled in a standard 24-hour non-overlapping schedule for ${normLabel}.`);
    }

    let { windows: filledWindows, filledMinutes } = fillScheduleGaps(currentWindows);
    if (validateSchedule(filledWindows).length > 0) {
      [filledWindows, filledMinutes] = [getDefaultScheduleForAgeBand(m.ageBand), 0];
    }
    if (filledMinutes > 0) {
      repairs.push(`Filled ${filledMinutes} minutes of uncovered routine with indoor rest for ${normLabel}.`);
    }

    repaired.push({ ...m, label: normLabel, windows: filledWindows });
  }

  return { members: repaired, repairs };
}
