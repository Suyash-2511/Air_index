import { formatClock, formatDuration, formatTimeOfDay } from "@/lib/format/time";
import type { Activity, AgeBand, Sensitivity } from "@/lib/types";

export { formatClock, formatDuration, formatTimeOfDay };

/** Plain-language names for routine activities, as a family would say them. */
export const ACTIVITY_LABELS: Record<Activity, string> = {
  sleep: "Sleeping",
  rest_indoor: "At home, resting",
  light_indoor: "At home, moving about",
  cooking: "Cooking",
  commute_vehicle: "Travelling by car, bus or auto",
  commute_walk: "Walking outside",
  commute_cycle: "Cycling",
  outdoor_work: "Working outdoors",
  outdoor_exercise: "Exercising outdoors",
  outdoor_play: "Playing outdoors",
};

/** Age groups with the ranges the breathing-rate tables use. */
export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  infant: "Baby (under 1)",
  child: "Child (1–10)",
  teen: "Teen (11–17)",
  adult: "Adult (18–64)",
  older_adult: "Older adult (65+)",
};

/** Health conditions shown as everyday names. */
export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  asthma: "Asthma",
  copd: "COPD",
  heart_condition: "Heart condition",
  pregnancy: "Pregnant",
};

/** Sentence-cases a model-written title while keeping acronyms such as N95, HEPA and PM2.5 intact. */
export function toSentenceCase(title: string): string {
  return title
    .split(" ")
    .map((word, i) => (i > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word))
    .join(" ");
}
