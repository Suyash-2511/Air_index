import { householdDose } from "../exposure";
import type { DayForecast, DoseBreakdown, Household } from "../types";
import { INTERVENTIONS, type Intervention } from "./catalogue";

/**
 * Sequentially applies a list of intervention IDs to a household against a day forecast,
 * returning the recomputed dose breakdown per member.
 *
 * Pure calculation with zero network I/O, enabling instantaneous (<1ms) client-side
 * recomputation in the browser when users toggle interventions on and off.
 */
export function combineInterventions(
  household: Household,
  forecast: DayForecast,
  activeInterventionIds: readonly string[],
  catalogue: readonly Intervention[] = INTERVENTIONS,
): readonly DoseBreakdown[] {
  const interventionMap = new Map<string, Intervention>(
    catalogue.map((item) => [item.id, item]),
  );

  let currentHousehold = household;
  for (const id of activeInterventionIds) {
    const intervention = interventionMap.get(id);
    if (!intervention) continue;
    const modified = intervention.apply(currentHousehold, forecast);
    if (modified) {
      currentHousehold = modified;
    }
  }

  return householdDose(currentHousehold, forecast);
}
