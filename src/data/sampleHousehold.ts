import { buildAsthmaticMother, buildDefaultHome, buildOvernightSleep } from "@/lib/household-defaults";
import type { Household, HouseholdMember, Location } from "@/lib/types";

/** The visitor's own routine: a cycling commute and a long indoor day. */
function buildUserMember(): HouseholdMember {
  return {
    id: "m-user",
    label: "You",
    ageBand: "adult",
    sensitivities: [],
    windows: [
      buildOvernightSleep(),
      { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 120, room: "living", mask: false },
      { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
      { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 780, room: "living", mask: false },
    ],
  };
}

/** Returns a default single-member household routine for new visitors. */
export function getDefaultHousehold(location: Location): Household {
  return { members: [buildUserMember()], home: buildDefaultHome(), location };
}

/** Returns a realistic multi-generational Delhi household routine for instant demo runs. */
export function getSampleHousehold(location: Location): Household {
  return { members: [buildUserMember(), buildAsthmaticMother("m-mother")], home: buildDefaultHome(), location };
}
