import type { DayForecast, HomeSetup, Household, HouseholdMember } from "@/lib/types";
import { toForecast } from "@/lib/exposure/dose";

/**
 * A severe winter-smog day shaped like a north-Indian city: high overnight,
 * a morning peak around 8–9 am, a cleaner mid-afternoon, and an evening rise.
 * Values are illustrative µg/m³, not a recorded day.
 */
const SMOG_CURVE = [
  260, 270, 275, 270, 260, 255, 270, 300, 320, 310, 270, 220,
  180, 160, 150, 155, 180, 230, 280, 300, 310, 300, 290, 275,
];

export const smogDay: DayForecast = toForecast(SMOG_CURVE.map((pm25, hour) => ({ hour, pm25 })));

/** A flat forecast makes arithmetic in tests easy to check by hand. */
export function flatDay(pm25: number): DayForecast {
  return toForecast(Array.from({ length: 24 }, (_, hour) => ({ hour, pm25 })));
}

export const baseHome: HomeSetup = {
  windowHabit: "open_sometimes",
  hasPurifier: false,
  purifierRoom: "living",
  cookingFuel: "lpg",
  hasExhaustFan: false,
  smokingIndoors: false,
};

export function member(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    id: "m1",
    label: "Member",
    ageBand: "adult",
    sensitivities: [],
    windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 60, room: "living", mask: false }],
    ...overrides,
  };
}

export function household(members: HouseholdMember[], home: Partial<HomeSetup> = {}): Household {
  return {
    members,
    home: { ...baseHome, ...home },
    location: { lat: 28.61, lng: 77.21, label: "New Delhi" },
  };
}

/** A cycling commuter's realistic weekday. */
export const cyclist = member({
  id: "cyclist",
  label: "Rahul",
  windows: [
    { activity: "sleep", setting: "indoor", startHour: 23, durationMinutes: 420, room: "bedroom", mask: false },
    { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 45, room: "living", mask: false },
    { activity: "rest_indoor", setting: "indoor", startHour: 10, durationMinutes: 480, room: "living", mask: false },
    { activity: "commute_cycle", setting: "outdoor", startHour: 18, durationMinutes: 45, room: "living", mask: false },
  ],
});

/** A grandparent with asthma who stays home and cooks. */
export const grandmother = member({
  id: "grandmother",
  label: "Aaji",
  ageBand: "older_adult",
  sensitivities: ["asthma"],
  windows: [
    { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
    { activity: "cooking", setting: "indoor", startHour: 7, durationMinutes: 60, room: "living", mask: false },
    { activity: "rest_indoor", setting: "indoor", startHour: 9, durationMinutes: 600, room: "living", mask: false },
  ],
});
