import { MAX_ROUTINE_ITEMS } from "./constants";
import { buildOutdoorItem, buildSealItem, buildVentilateItem } from "./forecast-items";
import { buildCommuteItems, buildCookItems, buildSleepItem } from "./member-items";
import { findDaytimeWindows, findDirtiestStretch } from "./routine-windows";
import type { RoutineContext, RoutineItem } from "./routine-types";
import type { RankedLike } from "./rules";
import type { Household } from "../types";

export type { RoutineItem } from "./routine-types";
export type { RankedLike } from "./rules";

interface ForecastHour {
  hour: number;
  pm25: number;
  o3?: number | undefined;
}

/** Steps that come from the air itself: when to ventilate, go outside, and seal the home. */
function buildForecastItems(context: RoutineContext, forecast: readonly ForecastHour[]): RoutineItem[] {
  const o3ByHour = new Map(forecast.flatMap((reading): [number, number][] => (reading.o3 === undefined ? [] : [[reading.hour, reading.o3]])));
  const windows = findDaytimeWindows(context.pm25ByHour, o3ByHour);
  const clean = windows[0];
  const worst = findDirtiestStretch(forecast);

  return [
    ...(clean ? [buildVentilateItem(context, clean), buildOutdoorItem(context, windows, clean)] : []),
    ...(worst ? [buildSealItem(context, worst)] : []),
  ].filter((item): item is RoutineItem => item !== undefined);
}

/**
 * Two steps in the same slot for the same purpose are one step for several people, so they merge:
 * members are combined and the first linked change is kept.
 */
function mergeSameSlotItems(items: readonly RoutineItem[]): RoutineItem[] {
  const merged = new Map<string, RoutineItem>();
  for (const item of items) {
    const slot = `${item.kind}-${item.startHour}-${item.endHour}`;
    const existing = merged.get(slot);
    if (!existing) {
      merged.set(slot, { ...item });
      continue;
    }
    existing.memberIds = Array.from(new Set([...existing.memberIds, ...item.memberIds]));
    if (!existing.interventionId && item.interventionId) {
      existing.interventionId = item.interventionId;
      existing.savedMicrograms = item.savedMicrograms;
      existing.reducesOwnEmissions = item.reducesOwnEmissions;
    }
  }
  return Array.from(merged.values());
}

/** Builds a chronological 24-hour routine combining ambient forecast peaks, member routines, and interventions. */
export function buildRoutine(
  household: Household,
  forecast: readonly ForecastHour[],
  ranked: readonly RankedLike[],
): RoutineItem[] {
  if (forecast.length === 0) return [];
  const context: RoutineContext = {
    household,
    ranked,
    pm25ByHour: new Map(forecast.map((reading) => [reading.hour, reading.pm25])),
  };

  const sleep = buildSleepItem(context);
  const items = [
    ...buildForecastItems(context, forecast),
    ...buildCommuteItems(context),
    ...buildCookItems(context),
    ...(sleep ? [sleep] : []),
  ];
  return mergeSameSlotItems(items)
    .sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour)
    .slice(0, MAX_ROUTINE_ITEMS);
}
