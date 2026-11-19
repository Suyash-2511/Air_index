/** Plain-language titles for ranked intervention IDs. */
export const INTERVENTION_TITLES: Record<string, string> = {
  keep_windows_closed: "Keep windows closed",
  hepa_purifier_bedroom: "Run HEPA air purifier in bedroom",
  hepa_purifier_living: "Run HEPA air purifier in living area",
  n95_mask_commute: "Wear N95/FFP2 mask during commute",
  n95_mask_outdoor: "Wear N95/FFP2 mask during outdoor chores",
  seal_doors_windows: "Weatherstrip doors and windows",
  air_purifier_bedroom: "Run air purifier in bedroom",
  air_purifier_living: "Run air purifier in living room",
  cleaner_cooking_fuel: "Switch to cleaner cooking fuel",
  kitchen_exhaust_fan: "Use kitchen exhaust fan while cooking",
  shift_outdoor_exercise_afternoon: "Shift outdoor exercise to afternoon",
  shift_commute_time: "Shift commute timing",
  avoid_outdoor_play_peak: "Avoid outdoor play during peak smog hours",
};

/** Returns human-friendly title for an intervention ID. */
export function getInterventionTitle(id: string): string {
  const match = INTERVENTION_TITLES[id];
  if (match) return match;
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
