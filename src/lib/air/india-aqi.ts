import type { AqiSummary } from "../types";
import { AQI_SCALE_MAX } from "./constants";

/**
 * CPCB National Air Quality Index (NAQI) bands and breakpoint definitions.
 * NOTE: Official CPCB methodology mandates 24-hour averaging for PM2.5, PM10, NO2, and SO2,
 * and 8-hour averaging for CO and O3. Here, real-time and forecast hourly concentrations
 * are used as a responsive instantaneous approximation of exposure severity.
 */
const AQI_BANDS = [
  { iLo: 0, iHi: 50, category: "Good" },
  { iLo: 51, iHi: 100, category: "Satisfactory" },
  { iLo: 101, iHi: 200, category: "Moderate" },
  { iLo: 201, iHi: 300, category: "Poor" },
  { iLo: 301, iHi: 400, category: "Very poor" },
  { iLo: 401, iHi: 500, category: "Severe" },
] as const;

type AqiCategory = (typeof AQI_BANDS)[number]["category"];

/** Breakpoints [bLo, bHi] corresponding to each of the 6 AQI bands. */
const CPCB_BREAKPOINTS = {
  pm25: [[0, 30], [31, 60], [61, 90], [91, 120], [121, 250], [251, 380]],
  pm10: [[0, 50], [51, 100], [101, 250], [251, 350], [351, 430], [431, 510]],
  no2: [[0, 40], [41, 80], [81, 180], [181, 280], [281, 400], [401, 500]],
  o3: [[0, 50], [51, 100], [101, 168], [169, 208], [209, 748], [749, 1000]],
  co: [[0, 1.0], [1.1, 2.0], [2.1, 10.0], [10.1, 17.0], [17.1, 34.0], [34.1, 50.0]],
  so2: [[0, 40], [41, 80], [81, 380], [381, 800], [801, 1600], [1601, 2000]],
} as const;

type PollutantKey = keyof typeof CPCB_BREAKPOINTS;

/** Every pollutant with breakpoints, listed once so loops keep the key type. */
const POLLUTANT_KEYS = ["pm25", "pm10", "no2", "o3", "co", "so2"] as const satisfies readonly PollutantKey[];

/** Computes the sub-index for a single pollutant using linear interpolation across CPCB bands. */
export function calculateSubIndex(pollutant: PollutantKey, concentration: number): number {
  if (!Number.isFinite(concentration) || concentration <= 0) return 0;
  const table = CPCB_BREAKPOINTS[pollutant];

  // The first band whose upper bound holds the value; anything above the last bound uses the last band.
  const firstMatch = table.findIndex(([, upper]) => concentration <= upper);
  const bandIdx = firstMatch === -1 ? table.length - 1 : firstMatch;

  const range = table[bandIdx];
  const band = AQI_BANDS[bandIdx];
  if (!range || !band) return 0; // Unreachable: every pollutant has one breakpoint range per AQI band.
  const [bLo, bHi] = range;
  const { iLo, iHi } = band;

  // Values between two bands (e.g. 60.5 for PM2.5) belong to the upper band's floor.
  const c = Math.max(concentration, bLo);
  const sub = iLo + ((iHi - iLo) / (bHi - bLo)) * (c - bLo);
  return Math.min(AQI_SCALE_MAX, Math.max(0, Math.round(sub)));
}

/** Resolves the descriptive CPCB category label from an AQI score. */
export function getAqiCategory(aqiValue: number): AqiCategory {
  if (aqiValue <= 50) return "Good";
  if (aqiValue <= 100) return "Satisfactory";
  if (aqiValue <= 200) return "Moderate";
  if (aqiValue <= 300) return "Poor";
  if (aqiValue <= 400) return "Very poor";
  return "Severe";
}

/** Pollutant concentrations in the units the CPCB breakpoints use; PM2.5 is required because an index without it is not reported. */
interface ConcentrationInput {
  pm25: number;
  pm10?: number | undefined;
  no2?: number | undefined;
  o3?: number | undefined;
  co?: number | undefined;
  so2?: number | undefined;
}

/**
 * Calculates overall Indian National Air Quality Index (AQI = max sub-index)
 * and identifies the dominant pollutant driving the health risk.
 */
export function calculateIndiaAqi(concentrations: ConcentrationInput): AqiSummary {
  const subIndices: Partial<Record<PollutantKey, number>> = {};
  let maxSub = -1;
  let dominant: PollutantKey = "pm25";

  for (const key of POLLUTANT_KEYS) {
    const concentration = concentrations[key];
    if (typeof concentration === "number" && Number.isFinite(concentration)) {
      const sub = calculateSubIndex(key, concentration);
      subIndices[key] = sub;
      if (sub > maxSub) {
        maxSub = sub;
        dominant = key;
      }
    }
  }

  return {
    value: Math.max(0, maxSub),
    category: getAqiCategory(Math.max(0, maxSub)),
    dominantPollutant: dominant,
    source: "computed",
  };
}
