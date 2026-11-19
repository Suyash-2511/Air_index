import { INFILTRATION_BY_WINDOW_HABIT } from "@/lib/exposure/infiltration";
import type { HomeSetup } from "@/lib/types";

/**
 * Dimensions of a residential room in metres.
 */
export interface RoomDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
}

/**
 * Configuration options for sizing a room air purifier and predicting indoor PM2.5.
 */
export interface PurifierSizingOptions {
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
export interface PurifierSizingResult {
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
  targetAch = 4.8,
  outdoorPm25,
  windowHabit = "kept_closed",
  naturalAch = 0.5,
  depositionRate = 0.2,
}: PurifierSizingOptions): PurifierSizingResult {
  const volumeM3 = Math.round(room.lengthM * room.widthM * room.heightM * 100) / 100;
  const cadrM3h = Math.round(volumeM3 * targetAch);
  const cadrCfm = Math.round(cadrM3h * 0.5886);

  const baselineFactor = INFILTRATION_BY_WINDOW_HABIT[windowHabit] ?? 0.45;
  const indoorWithout = Math.round(outdoorPm25 * baselineFactor * 10) / 10;

  // Numerator: P * a * C_out = baselineFactor * (a + k) * C_out
  const numerator = baselineFactor * (naturalAch + depositionRate) * outdoorPm25;
  const effectiveCadOverV = cadrM3h / (volumeM3 > 0 ? volumeM3 : 1);
  const denominator = naturalAch + depositionRate + effectiveCadOverV;

  const indoorWith = Math.round((numerator / denominator) * 10) / 10;
  const minutesToClean = effectiveCadOverV > 0 ? Math.round((60 / effectiveCadOverV) * 10) / 10 : 0;

  return {
    volumeM3,
    cadrM3h,
    cadrCfm,
    indoorWithout,
    indoorWith,
    minutesToClean,
  };
}
