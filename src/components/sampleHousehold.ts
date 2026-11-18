import type { Household, Location } from "@/lib/types";

/**
 * Returns a realistic multi-generational Delhi household routine for instant demo runs.
 */
export function getSampleHousehold(loc: Location): Household {
  return {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 120, room: "living", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 780, room: "living", mask: false },
        ],
      },
      {
        id: "m-mother",
        label: "Mother",
        ageBand: "older_adult",
        sensitivities: ["asthma"],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
        ],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: loc,
  };
}
