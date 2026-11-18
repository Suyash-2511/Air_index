import { minutesByHour, outdoorAt } from "../exposure/dose";
import type { ActivityWindow, DayForecast, HomeSetup, Household, HouseholdMember } from "../types";

/**
 * Small immutable helpers that interventions compose. Each returns a new
 * household, or null when nothing changed, so ranking can skip changes that
 * don't apply to this family.
 */

type WindowEdit = (window: ActivityWindow, member: HouseholdMember) => ActivityWindow;

/** Applies an edit to every window; returns null if no window actually changed. */
export function editWindows(household: Household, edit: WindowEdit): Household | null {
  let changed = false;
  const members = household.members.map((member) => ({
    ...member,
    windows: member.windows.map((window) => {
      const next = edit(window, member);
      if (next !== window) changed = true;
      return next;
    }),
  }));
  return changed ? { ...household, members } : null;
}

/** Applies a change to the home setup; returns null if the setup is unchanged. */
export function editHome(household: Household, patch: Partial<HomeSetup>): Household | null {
  const entries = Object.entries(patch) as [keyof HomeSetup, HomeSetup[keyof HomeSetup]][];
  if (entries.every(([key, value]) => household.home[key] === value)) return null;
  return { ...household, home: { ...household.home, ...patch } };
}

const COMMUTES = new Set<ActivityWindow["activity"]>(["commute_walk", "commute_cycle", "commute_vehicle"]);

/** True for windows spent travelling between home and work or school. */
export function isCommute(window: ActivityWindow): boolean {
  return COMMUTES.has(window.activity);
}

/** True for windows breathing outdoor or in-vehicle air rather than indoor air. */
export function isOutside(window: ActivityWindow): boolean {
  return window.setting !== "indoor";
}

/** Largest shift, in hours, that we suggest for a commute; beyond this it stops being realistic. */
export const MAX_SHIFT_HOURS = 3;

function meanOutdoor(window: ActivityWindow, forecast: DayForecast): number {
  const slices = minutesByHour(window);
  const minutes = slices.reduce((sum, s) => sum + s.minutes, 0);
  if (minutes === 0) return 0;
  return slices.reduce((sum, s) => sum + outdoorAt(forecast, s.hour) * s.minutes, 0) / minutes;
}

/**
 * The start hour within ±MAX_SHIFT_HOURS with the cleanest air for this window.
 * Ties keep the original hour, then prefer the smaller shift, so advice is stable.
 */
export function cleanestStartHour(window: ActivityWindow, forecast: DayForecast): number {
  let best = window.startHour;
  let bestMean = meanOutdoor(window, forecast);
  for (let offset = 1; offset <= MAX_SHIFT_HOURS; offset += 1) {
    for (const direction of [-1, 1]) {
      const hour = (window.startHour + direction * offset + 24) % 24;
      const mean = meanOutdoor({ ...window, startHour: hour }, forecast);
      if (mean < bestMean - 1e-9) {
        best = hour;
        bestMean = mean;
      }
    }
  }
  return best;
}
