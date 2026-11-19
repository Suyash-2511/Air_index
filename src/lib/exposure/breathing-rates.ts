import { MINUTES_PER_HOUR } from "../time-units";
import type { Activity, AgeBand } from "../types";

/**
 * Activity intensity levels used by the EPA Exposure Factors Handbook. The
 * handbook defines them by metabolic equivalents (METs): sleep, sedentary
 * (≤1.5 METs), light (1.5–3.0), moderate (3.0–6.0) and high (>6.0).
 */
export type Intensity = "sleep" | "sedentary" | "light" | "moderate" | "high";

/**
 * Mean short-term inhalation rates in m³ per minute.
 *
 * Source: U.S. EPA (2011) Exposure Factors Handbook, Chapter 6, Table 6-2
 * "Recommended Short-Term Exposure Values for Inhalation (Males and Females
 * Combined)", mean values. Each band uses one handbook age row:
 *   infant      → Birth to <1 year
 *   child       → 6 to <11 years
 *   teen        → 11 to <16 years
 *   adult       → 31 to <41 years
 *   older_adult → 61 to <71 years
 */
const RATES_M3_PER_MINUTE: Readonly<Record<AgeBand, Readonly<Record<Intensity, number>>>> = {
  infant: { sleep: 3.0e-3, sedentary: 3.1e-3, light: 7.6e-3, moderate: 1.4e-2, high: 2.6e-2 },
  child: { sleep: 4.5e-3, sedentary: 4.8e-3, light: 1.1e-2, moderate: 2.2e-2, high: 4.2e-2 },
  teen: { sleep: 5.0e-3, sedentary: 5.4e-3, light: 1.3e-2, moderate: 2.5e-2, high: 4.9e-2 },
  adult: { sleep: 4.6e-3, sedentary: 4.3e-3, light: 1.2e-2, moderate: 2.7e-2, high: 4.9e-2 },
  older_adult: { sleep: 5.2e-3, sedentary: 4.9e-3, light: 1.2e-2, moderate: 2.6e-2, high: 4.7e-2 },
};

/**
 * Which EPA intensity level each everyday activity falls into.
 *
 * ASSUMPTION: the handbook gives rates per intensity, not per activity, so this
 * mapping is ours. It follows typical MET values from the Compendium of
 * Physical Activities (Ainsworth et al., 2011): walking at a normal pace is
 * moderate (~3.5 METs), commuting by bicycle is high (~6.8 METs), cooking and
 * light housework are light, and riding in a vehicle is sedentary.
 */
export const ACTIVITY_INTENSITY: Readonly<Record<Activity, Intensity>> = {
  sleep: "sleep",
  rest_indoor: "sedentary",
  light_indoor: "light",
  cooking: "light",
  commute_vehicle: "sedentary",
  commute_walk: "moderate",
  commute_cycle: "high",
  outdoor_work: "moderate",
  outdoor_exercise: "high",
  outdoor_play: "moderate",
};

/**
 * Breathing rate in m³ per hour for a person of this age band doing this
 * activity. Per-hour units match hourly air-quality data, so dose arithmetic
 * stays in one unit system.
 */
export function breathingRateM3PerHour(ageBand: AgeBand, activity: Activity): number {
  const intensity = ACTIVITY_INTENSITY[activity];
  return RATES_M3_PER_MINUTE[ageBand][intensity] * MINUTES_PER_HOUR;
}

/** Exposed for tests and documentation tables; never mutated. */
export function rawRateM3PerMinute(ageBand: AgeBand, intensity: Intensity): number {
  return RATES_M3_PER_MINUTE[ageBand][intensity];
}
