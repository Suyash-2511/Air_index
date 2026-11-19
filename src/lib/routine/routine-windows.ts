import { HOURS_PER_DAY } from "../time-units";
import {
  DAYTIME_LAST_WINDOW_START,
  DAYTIME_START_HOUR,
  SMOG_PEAK_MEAN_MULTIPLE,
  SMOG_PEAK_MIN_UGM3,
  WINDOW_HOURS,
} from "./constants";

/** A daytime window scored by its mean PM2.5 (and ozone, when forecast). */
export interface WindowScore {
  start: number;
  end: number;
  mean: number;
  meanO3?: number | undefined;
}

interface Reading {
  hour: number;
  pm25: number;
}

/** Mean of a value over an hour and the next, or undefined when either hour has no forecast. */
function meanOfHourPair(values: ReadonlyMap<number, number>, hour: number): number | undefined {
  const first = values.get(hour);
  const second = values.get(hour + 1);
  return first !== undefined && second !== undefined ? (first + second) / 2 : undefined;
}

/** Evaluates all 2-hour daytime blocks (07:00-19:00) ranked by lowest PM2.5. */
export function findDaytimeWindows(
  pm25ByHour: ReadonlyMap<number, number>,
  o3ByHour: ReadonlyMap<number, number>,
): WindowScore[] {
  const windows: WindowScore[] = [];
  for (let hour = DAYTIME_START_HOUR; hour <= DAYTIME_LAST_WINDOW_START; hour += 1) {
    const mean = meanOfHourPair(pm25ByHour, hour);
    if (mean === undefined) continue;
    windows.push({ start: hour, end: hour + WINDOW_HOURS, mean, meanO3: meanOfHourPair(o3ByHour, hour) });
  }
  return windows.sort((a, b) => a.mean - b.mean);
}

function averagePm25(readings: readonly Reading[]): number {
  return readings.reduce((sum, reading) => sum + reading.pm25, 0) / readings.length;
}

/** Splits the day into runs of consecutive readings at or above the threshold. */
function groupPeakRuns(forecast: readonly Reading[], threshold: number): Reading[][] {
  const runs: Reading[][] = [];
  let current: Reading[] = [];
  for (const reading of forecast) {
    if (reading.pm25 >= threshold) {
      current.push(reading);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** Identifies contiguous peak smog hours exceeding 1.5x daily average or 90 µg/m³. */
export function findDirtiestStretch(
  forecast: readonly Reading[],
): { start: number; end: number; mean: number } | undefined {
  if (forecast.length === 0) return undefined;
  const threshold = Math.max(SMOG_PEAK_MEAN_MULTIPLE * averagePm25(forecast), SMOG_PEAK_MIN_UGM3);
  const worst = groupPeakRuns(forecast, threshold).sort((a, b) => averagePm25(b) - averagePm25(a))[0];
  const first = worst?.[0];
  const last = worst?.[worst.length - 1];
  if (!worst || !first || !last) return undefined;
  return { start: first.hour, end: Math.min(HOURS_PER_DAY, last.hour + 1), mean: Math.round(averagePm25(worst)) };
}
