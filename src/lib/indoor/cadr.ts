import { INFILTRATION_BY_WINDOW_HABIT } from "../exposure";
import type { HomeSetup } from "../types";
import { roundTo } from "../format";
import { MINUTES_PER_HOUR } from "../time-units";
import { CFM_PER_M3H, DEFAULT_DEPOSITION_RATE, DEFAULT_NATURAL_ACH, FALLBACK_INFILTRATION, SMOG_TARGET_ACH } from "./constants";

/**
 * Dimensions of a residential room in metres.
 */
interface RoomDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
}

/**
 * Configuration options for sizing a room air purifier and predicting indoor PM2.5.
 */
interface PurifierSizingOptions {
  room: RoomDimensions;
  targetAch?: number;
  outdoorPm25: number;
  windowHabit?: HomeSetup["windowHabit"];
  naturalAch?: number;
  depositionRate?: number;
}

/**
 * Purifier CADR sizing and steady-state particulate reduction results.
 * Guidance: AHAM ANSI/AHAM AC-1 (2/3 rule) and US EPA "Guide to Air Cleaners in the Home"
 * specify 4.8 air changes per hour (ACH) for severe smog events, and ~2.0 ACH for baseline days.
 */
interface PurifierSizingResult {
  volumeM3: number;
  cadrM3h: number;
  cadrCfm: number;
  indoorWithout: number;
  indoorWith: number;
  minutesToClean: number;
}

/**
 * Calculates required clean air delivery rate (CADR) in m³/h and CFM,
 * steady-state indoor PM2.5 with and without filtration, and cleaning time.
 *
 * Steady-state model: C_in = (P · a · C_out) / (a + k + CADR / V)
 * where P is envelope penetration, a is natural air exchange (h^-1),
 * and k is surface deposition loss rate (h^-1).
 */
export function calculatePurifierSizing({
  room,
  targetAch = SMOG_TARGET_ACH,
  outdoorPm25,
  windowHabit = "kept_closed",
  naturalAch = DEFAULT_NATURAL_ACH,
  depositionRate = DEFAULT_DEPOSITION_RATE,
}: PurifierSizingOptions): PurifierSizingResult {
  const volumeM3 = roundTo(room.lengthM * room.widthM * room.heightM, 2);
  const cadrM3h = Math.round(volumeM3 * targetAch);
  const cadrCfm = Math.round(cadrM3h * CFM_PER_M3H);

  const baselineFactor = INFILTRATION_BY_WINDOW_HABIT[windowHabit] ?? FALLBACK_INFILTRATION;
  const indoorWithout = roundTo(outdoorPm25 * baselineFactor, 1);

  // Numerator: P * a * C_out = baselineFactor * (a + k) * C_out
  const numerator = baselineFactor * (naturalAch + depositionRate) * outdoorPm25;
  const effectiveCadOverV = cadrM3h / (volumeM3 > 0 ? volumeM3 : 1);
  const denominator = naturalAch + depositionRate + effectiveCadOverV;

  const indoorWith = roundTo(numerator / denominator, 1);
  const minutesToClean = effectiveCadOverV > 0 ? roundTo(MINUTES_PER_HOUR / effectiveCadOverV, 1) : 0;

  return {
    volumeM3,
    cadrM3h,
    cadrCfm,
    indoorWithout,
    indoorWith,
    minutesToClean,
  };
}
