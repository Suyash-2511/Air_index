import { INTERVENTION_TITLES } from "../gemini/grounding";
import type { Activity } from "../types";

/** Ranked change summary consumed by the routine builder. */
export interface RankedLike {
  id: string;
  savedMicrograms: number;
  reducesOwnEmissions: boolean;
}

/** Which ranked changes make sense for each kind of commute. */
export const COMMUTE_FIT: Partial<Record<Activity, readonly string[]>> = {
  commute_cycle: ["public_transport_instead_of_cycling", "shift_commute_time", "shift_commute", "mask_outdoors", "n95_mask_commute"],
  commute_walk: ["shift_commute_time", "shift_commute", "mask_outdoors", "n95_mask_commute"],
  commute_vehicle: ["shift_commute_time", "shift_commute"],
};

export const COMMUTE_FALLBACK: Partial<Record<Activity, string>> = {
  commute_cycle: "Wear an N95 mask while cycling",
  commute_walk: "Wear an N95 mask while walking",
  commute_vehicle: "Keep car windows up, air on recirculate",
};

export function bestFor(ranked: readonly RankedLike[], ids: readonly string[]): RankedLike | undefined {
  return ranked.filter((r) => ids.includes(r.id)).sort((a, b) => b.savedMicrograms - a.savedMicrograms)[0];
}

export function titleFor(id: string): string {
  return INTERVENTION_TITLES[id] ?? id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** End hour of a window; may pass 24 so overnight blocks keep their real length. */
export function endOf(startHour: number, durationMinutes: number): number {
  return startHour + Math.max(1, Math.ceil(durationMinutes / 60));
}
