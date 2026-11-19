import { MINUTES_PER_HOUR } from "./time-units";
import type { ActivityWindow, HomeSetup, HouseholdMember } from "./types";

/** The default day: asleep from 10 PM for eight hours, up at 6 AM. Every default routine is built from these. */
export const BEDTIME_HOUR = 22;
export const WAKE_HOUR = 6;
export const ADULT_SLEEP_MINUTES = 8 * MINUTES_PER_HOUR;
export const AWAKE_MINUTES = 16 * MINUTES_PER_HOUR;

/** A new household starts as an average home: windows often open, LPG cooking, no purifier. */
export function buildDefaultHome(): HomeSetup {
  return {
    windowHabit: "open_often",
    hasPurifier: false,
    purifierRoom: "living",
    cookingFuel: "lpg",
    hasExhaustFan: false,
    smokingIndoors: false,
  };
}

/** Eight hours of bedroom sleep from 10 PM, the one block every default routine shares. */
export function buildOvernightSleep(): ActivityWindow {
  return { activity: "sleep", setting: "indoor", startHour: BEDTIME_HOUR, durationMinutes: ADULT_SLEEP_MINUTES, room: "bedroom", mask: false };
}

/** The older family member with asthma used by the sample household and the demo-mode intake. */
export function buildAsthmaticMother(id: string): HouseholdMember {
  return {
    id,
    label: "Mother",
    ageBand: "older_adult",
    sensitivities: ["asthma"],
    windows: [
      buildOvernightSleep(),
      { activity: "rest_indoor", setting: "indoor", startHour: WAKE_HOUR, durationMinutes: AWAKE_MINUTES, room: "living", mask: false },
    ],
  };
}

/** A person added by hand: sleeps overnight and spends the rest of the day indoors until edited. */
export function buildNewMember(id: string, label: string): HouseholdMember {
  return {
    id,
    label,
    ageBand: "adult",
    sensitivities: [],
    windows: [
      buildOvernightSleep(),
      { activity: "light_indoor", setting: "indoor", startHour: WAKE_HOUR, durationMinutes: AWAKE_MINUTES, room: "living", mask: false },
    ],
  };
}
