import type { Activity, AgeBand, Sensitivity } from "@/lib/types";

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

/** Formats minutes as "30 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Formats a 24h hour as "6 AM", "12 PM", "11 PM". */
export function formatClock(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** Formats minutes after midnight as "6 AM" or "6:30 AM", wrapping past midnight. */
export function formatTimeOfDay(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const clock = formatClock(h);
  return m === 0 ? clock : clock.replace(" ", `:${m.toString().padStart(2, "0")} `);
}

/**
 * Sentence-cases a model-written title ("Add Bedroom Purifier" → "Add bedroom
 * purifier") while keeping acronyms such as N95, HEPA and PM2.5 intact.
 */
export function toSentenceCase(title: string): string {
  return title
    .split(" ")
    .map((word, i) => (i > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word))
    .join(" ");
}
