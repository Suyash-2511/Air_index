import type { Activity, ActivityWindow, DayForecast, DoseBreakdown, HomeSetup, Household, HouseholdMember } from "../types";
import { breathingRateM3PerHour } from "./breathing-rates";
import { HOURS_PER_DAY, MINUTES_PER_HOUR } from "../time-units";
import { concentrationFor } from "./infiltration";

/**
 * Splits a window into the minutes it spends in each clock hour, wrapping past
 * midnight. Hourly splitting matters because outdoor PM2.5 can change several
 * times over within a single long commute or night's sleep.
 */
export function minutesByHour(window: ActivityWindow): ReadonlyArray<{ hour: number; minutes: number }> {
  const slices: { hour: number; minutes: number }[] = [];
  let remaining = Math.min(window.durationMinutes, HOURS_PER_DAY * MINUTES_PER_HOUR);
  let hour = window.startHour;
  while (remaining > 0) {
    const minutes = Math.min(remaining, MINUTES_PER_HOUR);
    slices.push({ hour: hour % HOURS_PER_DAY, minutes });
    remaining -= minutes;
    hour += 1;
  }
  return slices;
}

/**
 * Outdoor PM2.5 for an hour. A missing hour falls back to the day's mean so a
 * gap in forecast data never produces NaN or silently zero exposure.
 */
export function outdoorAt(forecast: DayForecast, hour: number): number {
  const value = forecast.get(hour);
  if (value !== undefined && Number.isFinite(value)) return Math.max(0, value);
  return meanOf(forecast);
}

function meanOf(forecast: DayForecast): number {
  const values = [...forecast.values()].filter((v) => Number.isFinite(v));
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Micrograms of PM2.5 inhaled during one window:
 * concentration (µg/m³) × breathing rate (m³/h) × time (h), summed hour by hour.
 */
export function doseForWindow(
  window: ActivityWindow,
  member: HouseholdMember,
  forecast: DayForecast,
  home: HomeSetup,
): { total: number; byHour: ReadonlyArray<{ hour: number; micrograms: number }> } {
  const rate = breathingRateM3PerHour(member.ageBand, window.activity);
  const byHour = minutesByHour(window).map(({ hour, minutes }) => ({
    hour,
    micrograms: concentrationFor(window, outdoorAt(forecast, hour), home) * rate * (minutes / MINUTES_PER_HOUR),
  }));
  return { total: byHour.reduce((sum, h) => sum + h.micrograms, 0), byHour };
}

/** A member's whole-day inhaled dose with breakdowns by activity and by hour. */
export function dailyDose(member: HouseholdMember, forecast: DayForecast, home: HomeSetup): DoseBreakdown {
  const byHour = new Array<number>(HOURS_PER_DAY).fill(0);
  const byActivity: Partial<Record<Activity, number>> = {};
  for (const window of member.windows) {
    const dose = doseForWindow(window, member, forecast, home);
    byActivity[window.activity] = (byActivity[window.activity] ?? 0) + dose.total;
    for (const { hour, micrograms } of dose.byHour) byHour[hour] = (byHour[hour] ?? 0) + micrograms;
  }
  const totalMicrograms = byHour.reduce((sum, v) => sum + v, 0);
  return { memberId: member.id, totalMicrograms, byActivity, byHour };
}

/** Daily dose for every member of the household, in member order. */
export function householdDose(household: Household, forecast: DayForecast): readonly DoseBreakdown[] {
  return household.members.map((member) => dailyDose(member, forecast, household.home));
}

/** Builds a forecast lookup from hourly readings; later readings for the same hour win. */
export function toForecast(readings: ReadonlyArray<{ hour: number; pm25: number }>): DayForecast {
  return new Map(readings.map((r) => [r.hour, r.pm25]));
}
