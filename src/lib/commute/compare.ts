import { MINUTES_PER_HOUR } from "../time-units";
import { DEFAULT_COMMUTE_KM, MAX_COMMUTE_KM, MIN_COMMUTE_KM, MIN_TRIP_MINUTES } from "./constants";
import { rawRateM3PerMinute } from "@/lib/exposure";
import { VEHICLE_CABIN_FACTOR } from "@/lib/exposure";
import type { TranslationKey } from "@/lib/i18n";
import type { AgeBand } from "@/lib/types";
import { roundTo } from "../format";

/** Travel mode for urban daily commuting in India. */
type CommuteMode = "walk" | "cycle" | "bus" | "metro" | "auto" | "car";

/** Evaluated travel mode with physiological dose and greenhouse gas footprint. */
export interface CommuteModeComparison {
  mode: CommuteMode;
  label: string;
  speedKmh: number;
  durationMin: number;
  inhaledMicrograms: number;
  co2Grams: number;
  isBestForLungs: boolean;
  isBestForCity: boolean;
  matchingInterventionId?: string | undefined;
  labelKey: TranslationKey;
}

/** Options for the multimodal commute evaluation. */
interface CommuteCompareOptions {
  distanceKm?: number | undefined;
  outdoorPm25: number;
  ageBand?: AgeBand | undefined;
}

/** Result containing ranked commute modes and standout recommendations. */
interface CommuteComparisonResult {
  distanceKm: number;
  modes: readonly CommuteModeComparison[];
  bestForLungs: CommuteModeComparison;
  bestForCity: CommuteModeComparison;
}

const MODE_KEYS: Record<CommuteMode, TranslationKey> = {
  walk: "commute_mode_walk",
  cycle: "commute_mode_cycle",
  bus: "commute_mode_bus",
  metro: "commute_mode_metro",
  auto: "commute_mode_auto",
  car: "commute_mode_car",
};

interface ModeSpec {
  mode: CommuteMode;
  label: string;
  speedKmh: number;
  intensity: "sedentary" | "moderate" | "high";
  cabinInfiltration: number;
  co2GramsPerKm: number;
  matchingInterventionId?: string | undefined;
}

/**
 * Empirical parameters for Indian urban transit modes:
 * - Metro cabin factor 0.60: assumption for closed, air-conditioned coaches (same as the car cabin factor).
 * - Car cabin factor: VEHICLE_CABIN_FACTOR from the dose engine, so both parts of the app agree.
 * - Bus cabin factor 0.80: assumption for non-AC buses with open windows.
 * - Auto factor 0.90: assumption for an open-sided three-wheeler in traffic.
 * - CO2 factors: India GHG Program / ICCT India urban passenger transit factors per passenger-km.
 */
const MODE_SPECS: readonly ModeSpec[] = [
  { mode: "walk", label: "Walking", speedKmh: 4.5, intensity: "moderate", cabinInfiltration: 1.0, co2GramsPerKm: 0 },
  { mode: "cycle", label: "Cycling", speedKmh: 15, intensity: "high", cabinInfiltration: 1.0, co2GramsPerKm: 0 },
  { mode: "bus", label: "City bus", speedKmh: 16, intensity: "sedentary", cabinInfiltration: 0.8, co2GramsPerKm: 28, matchingInterventionId: "public_transport_instead_of_cycling" },
  { mode: "metro", label: "Metro train", speedKmh: 32, intensity: "sedentary", cabinInfiltration: 0.6, co2GramsPerKm: 16, matchingInterventionId: "public_transport_instead_of_cycling" },
  { mode: "auto", label: "Auto-rickshaw", speedKmh: 22, intensity: "sedentary", cabinInfiltration: 0.9, co2GramsPerKm: 58 },
  { mode: "car", label: "Private car (solo)", speedKmh: 24, intensity: "sedentary", cabinInfiltration: VEHICLE_CABIN_FACTOR, co2GramsPerKm: 142 },
];

/** The first mode that no later mode beats under the comparator. The mode list is never empty. */
function firstBest(
  modes: readonly CommuteModeComparison[],
  compare: (a: CommuteModeComparison, b: CommuteModeComparison) => number,
): CommuteModeComparison {
  return modes.reduce((best, mode) => (compare(mode, best) < 0 ? mode : best));
}

/**
 * Compares commute modes for personal inhaled PM2.5 and trip CO2 emissions.
 */
export function compareCommuteModes({
  distanceKm = DEFAULT_COMMUTE_KM,
  outdoorPm25,
  ageBand = "adult",
}: CommuteCompareOptions): CommuteComparisonResult {
  const safeDistance = Math.max(MIN_COMMUTE_KM, Math.min(MAX_COMMUTE_KM, distanceKm));

  const list: CommuteModeComparison[] = MODE_SPECS.map((spec) => {
    const durationMin = Math.max(MIN_TRIP_MINUTES, Math.round((safeDistance / spec.speedKmh) * MINUTES_PER_HOUR));
    const breathingRate = rawRateM3PerMinute(ageBand, spec.intensity);
    const inhaledMicrograms = roundTo(outdoorPm25 * spec.cabinInfiltration * breathingRate * durationMin, 1);
    const co2Grams = Math.round(safeDistance * spec.co2GramsPerKm);

    return {
      mode: spec.mode,
      label: spec.label,
      speedKmh: spec.speedKmh,
      durationMin,
      inhaledMicrograms,
      co2Grams,
      isBestForLungs: false,
      isBestForCity: false,
      matchingInterventionId: spec.matchingInterventionId,
      labelKey: MODE_KEYS[spec.mode],
    };
  });

  list.sort((a, b) => a.inhaledMicrograms - b.inhaledMicrograms);

  const bestForLungs = firstBest(list, (a, b) => a.inhaledMicrograms - b.inhaledMicrograms);
  bestForLungs.isBestForLungs = true;

  // Best for the city is lowest CO2; ties go to whichever mode is easier on the lungs.
  const bestForCity = firstBest(list, (a, b) => a.co2Grams - b.co2Grams || a.inhaledMicrograms - b.inhaledMicrograms);
  bestForCity.isBestForCity = true;

  return {
    distanceKm: safeDistance,
    modes: list,
    bestForLungs,
    bestForCity,
  };
}
