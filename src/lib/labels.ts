import { formatClock, formatDuration, formatTimeOfDay } from "./format";
import { t, type Locale, type TranslationKey } from "./i18n";
import type { Activity, AgeBand, Sensitivity } from "./types";

export { formatClock, formatDuration, formatTimeOfDay };

/** Translation key mapping for daily routine activities. */
const ACTIVITY_KEYS: Record<Activity, TranslationKey> = {
  sleep: "activity_sleep",
  rest_indoor: "activity_rest_indoor",
  light_indoor: "activity_light_indoor",
  cooking: "activity_cooking",
  commute_vehicle: "activity_commute_vehicle",
  commute_walk: "activity_commute_walk",
  commute_cycle: "activity_commute_cycle",
  outdoor_work: "activity_outdoor_work",
  outdoor_exercise: "activity_outdoor_exercise",
  outdoor_play: "activity_outdoor_play",
};

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

/** Translation key mapping for age bands. */
const AGE_BAND_KEYS: Record<AgeBand, TranslationKey> = {
  infant: "age_band_infant",
  child: "age_band_child",
  teen: "age_band_teen",
  adult: "age_band_adult",
  older_adult: "age_band_older_adult",
};

/** Age groups with the ranges the breathing-rate tables use. */
export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  infant: "Baby (under 1)",
  child: "Child (1–10)",
  teen: "Teen (11–17)",
  adult: "Adult (18–64)",
  older_adult: "Older adult (65+)",
};

/** Translation key mapping for health sensitivities. */
const SENSITIVITY_KEYS: Record<Sensitivity, TranslationKey> = {
  asthma: "sensitivity_asthma",
  copd: "sensitivity_copd",
  heart_condition: "sensitivity_heart_condition",
  pregnancy: "sensitivity_pregnancy",
};

/** Health conditions shown as everyday names. */
export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  asthma: "Asthma",
  copd: "COPD",
  heart_condition: "Heart condition",
  pregnancy: "Pregnant",
};

/** Gets localized label for an activity. */
export function getActivityLabel(activity: Activity, locale: Locale = "en"): string {
  return t(locale, ACTIVITY_KEYS[activity]);
}

/** Gets localized label for an age band. */
export function getAgeBandLabel(ageBand: AgeBand, locale: Locale = "en"): string {
  return t(locale, AGE_BAND_KEYS[ageBand]);
}

/** Gets localized label for a health condition. */
export function getSensitivityLabel(sensitivity: Sensitivity, locale: Locale = "en"): string {
  return t(locale, SENSITIVITY_KEYS[sensitivity]);
}

/** Sentence-cases a model-written title while keeping acronyms such as N95, HEPA and PM2.5 intact. */
export function toSentenceCase(title: string): string {
  return title
    .split(" ")
    .map((word, i) => (i > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word))
    .join(" ");
}
