import type { HourlyAir, Location } from "../types";
import type { AirProvider } from "./provider";

/**
 * Illustrative deterministic 24-hour winter smog profile for New Delhi.
 * Models overnight cold-inversion build-up, 8–9 AM traffic peak, afternoon solar dispersion, and evening heating rise.
 * NOTE: These are synthetic illustrative benchmark values, NOT recorded sensor data.
 */
export const DELHI_SEVERE_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 240, pm10: 380, no2: 65, o3: 20 },
  { hour: 1, pm25: 250, pm10: 395, no2: 68, o3: 18 },
  { hour: 2, pm25: 260, pm10: 410, no2: 70, o3: 16 },
  { hour: 3, pm25: 270, pm10: 425, no2: 72, o3: 15 },
  { hour: 4, pm25: 265, pm10: 420, no2: 75, o3: 14 },
  { hour: 5, pm25: 275, pm10: 435, no2: 80, o3: 15 },
  { hour: 6, pm25: 290, pm10: 460, no2: 88, o3: 18 },
  { hour: 7, pm25: 320, pm10: 510, no2: 95, o3: 22 },
  { hour: 8, pm25: 350, pm10: 560, no2: 105, o3: 28 },
  { hour: 9, pm25: 365, pm10: 580, no2: 100, o3: 35 },
  { hour: 10, pm25: 330, pm10: 520, no2: 85, o3: 45 },
  { hour: 11, pm25: 280, pm10: 440, no2: 72, o3: 52 },
  { hour: 12, pm25: 230, pm10: 360, no2: 60, o3: 58 },
  { hour: 13, pm25: 190, pm10: 300, no2: 52, o3: 62 },
  { hour: 14, pm25: 160, pm10: 250, no2: 48, o3: 65 },
  { hour: 15, pm25: 175, pm10: 275, no2: 54, o3: 60 },
  { hour: 16, pm25: 200, pm10: 315, no2: 62, o3: 50 },
  { hour: 17, pm25: 250, pm10: 395, no2: 75, o3: 38 },
  { hour: 18, pm25: 290, pm10: 460, no2: 90, o3: 28 },
  { hour: 19, pm25: 320, pm10: 510, no2: 98, o3: 24 },
  { hour: 20, pm25: 340, pm10: 540, no2: 94, o3: 22 },
  { hour: 21, pm25: 325, pm10: 515, no2: 86, o3: 20 },
  { hour: 22, pm25: 295, pm10: 470, no2: 78, o3: 20 },
  { hour: 23, pm25: 265, pm10: 420, no2: 70, o3: 20 },
];

/**
 * Illustrative deterministic 24-hour moderate winter profile for Mumbai.
 * Models coastal sea-breeze afternoon clearing and evening rush hour.
 * NOTE: These are synthetic illustrative benchmark values, NOT recorded sensor data.
 */
export const MUMBAI_MODERATE_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 65, pm10: 95, no2: 35, o3: 22 },
  { hour: 1, pm25: 68, pm10: 98, no2: 36, o3: 20 },
  { hour: 2, pm25: 70, pm10: 102, no2: 38, o3: 18 },
  { hour: 3, pm25: 72, pm10: 105, no2: 40, o3: 16 },
  { hour: 4, pm25: 75, pm10: 110, no2: 42, o3: 16 },
  { hour: 5, pm25: 78, pm10: 114, no2: 45, o3: 18 },
  { hour: 6, pm25: 84, pm10: 122, no2: 52, o3: 20 },
  { hour: 7, pm25: 95, pm10: 138, no2: 60, o3: 24 },
  { hour: 8, pm25: 115, pm10: 168, no2: 72, o3: 30 },
  { hour: 9, pm25: 120, pm10: 175, no2: 70, o3: 36 },
  { hour: 10, pm25: 105, pm10: 152, no2: 58, o3: 42 },
  { hour: 11, pm25: 80, pm10: 116, no2: 45, o3: 48 },
  { hour: 12, pm25: 65, pm10: 94, no2: 38, o3: 54 },
  { hour: 13, pm25: 50, pm10: 72, no2: 32, o3: 58 },
  { hour: 14, pm25: 42, pm10: 60, no2: 28, o3: 60 },
  { hour: 15, pm25: 45, pm10: 65, no2: 30, o3: 56 },
  { hour: 16, pm25: 55, pm10: 80, no2: 36, o3: 48 },
  { hour: 17, pm25: 70, pm10: 102, no2: 46, o3: 38 },
  { hour: 18, pm25: 85, pm10: 124, no2: 58, o3: 30 },
  { hour: 19, pm25: 98, pm10: 142, no2: 64, o3: 26 },
  { hour: 20, pm25: 102, pm10: 148, no2: 60, o3: 24 },
  { hour: 21, pm25: 95, pm10: 138, no2: 52, o3: 24 },
  { hour: 22, pm25: 82, pm10: 118, no2: 44, o3: 23 },
  { hour: 23, pm25: 72, pm10: 104, no2: 38, o3: 22 },
];

/**
 * Illustrative deterministic 24-hour relatively clean profile for Nashik.
 * Models clean plateau air with mild morning and evening heating signatures.
 * NOTE: These are synthetic illustrative benchmark values, NOT recorded sensor data.
 */
export const NASHIK_CLEAN_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 22, pm10: 32, no2: 14, o3: 20 },
  { hour: 1, pm25: 24, pm10: 35, no2: 15, o3: 18 },
  { hour: 2, pm25: 25, pm10: 36, no2: 16, o3: 16 },
  { hour: 3, pm25: 26, pm10: 38, no2: 16, o3: 15 },
  { hour: 4, pm25: 28, pm10: 40, no2: 18, o3: 15 },
  { hour: 5, pm25: 30, pm10: 44, no2: 20, o3: 16 },
  { hour: 6, pm25: 34, pm10: 50, no2: 24, o3: 18 },
  { hour: 7, pm25: 38, pm10: 55, no2: 28, o3: 22 },
  { hour: 8, pm25: 48, pm10: 70, no2: 35, o3: 26 },
  { hour: 9, pm25: 52, pm10: 76, no2: 34, o3: 30 },
  { hour: 10, pm25: 44, pm10: 64, no2: 28, o3: 35 },
  { hour: 11, pm25: 32, pm10: 46, no2: 22, o3: 40 },
  { hour: 12, pm25: 25, pm10: 36, no2: 18, o3: 44 },
  { hour: 13, pm25: 18, pm10: 26, no2: 14, o3: 48 },
  { hour: 14, pm25: 15, pm10: 22, no2: 12, o3: 50 },
  { hour: 15, pm25: 16, pm10: 24, no2: 14, o3: 46 },
  { hour: 16, pm25: 20, pm10: 30, no2: 16, o3: 40 },
  { hour: 17, pm25: 26, pm10: 38, no2: 22, o3: 34 },
  { hour: 18, pm25: 34, pm10: 50, no2: 28, o3: 28 },
  { hour: 19, pm25: 40, pm10: 58, no2: 32, o3: 24 },
  { hour: 20, pm25: 42, pm10: 62, no2: 30, o3: 22 },
  { hour: 21, pm25: 38, pm10: 55, no2: 26, o3: 22 },
  { hour: 22, pm25: 30, pm10: 44, no2: 20, o3: 21 },
  { hour: 23, pm25: 25, pm10: 36, no2: 16, o3: 20 },
];

/** Selects the closest regional fixture dataset based on coordinates. */
export function getClosestFixture(location: Location): readonly HourlyAir[] {
  const defaultTarget = { city: "delhi", lat: 28.61, lng: 77.21, data: DELHI_SEVERE_WINTER_FIXTURE };
  const targets = [
    defaultTarget,
    { city: "mumbai", lat: 19.08, lng: 72.88, data: MUMBAI_MODERATE_WINTER_FIXTURE },
    { city: "nashik", lat: 20.0, lng: 73.78, data: NASHIK_CLEAN_WINTER_FIXTURE },
  ];

  let best = defaultTarget;
  let minDistance = Infinity;

  for (const t of targets) {
    const d = (location.lat - t.lat) ** 2 + (location.lng - t.lng) ** 2;
    if (d < minDistance) {
      minDistance = d;
      best = t;
    }
  }

  return best.data;
}

/**
 * Offline air quality provider serving deterministic illustrative Indian winter data.
 * Enables local testing, CI validation, and uncredentialed exploration.
 */
export class FixtureAirProvider implements AirProvider {
  /** Returns the current local hour's reading from the matching regional fixture. */
  async current(location: Location): Promise<HourlyAir> {
    const series = getClosestFixture(location);
    const hour = new Date().getHours() % 24;
    const fallback: HourlyAir = series[0] ?? { hour: 0, pm25: 100 };
    return series[hour] ?? fallback;
  }

  /** Returns requested hours of forecast starting from the current hour. */
  async forecast(location: Location, hours: number): Promise<HourlyAir[]> {
    const series = getClosestFixture(location);
    const startHour = new Date().getHours() % 24;
    const result: HourlyAir[] = [];
    const count = Math.max(1, hours);
    const fallback: HourlyAir = series[0] ?? { hour: 0, pm25: 100 };

    for (let i = 0; i < count; i++) {
      const targetHour = (startHour + i) % 24;
      const base = series[targetHour] ?? fallback;
      result.push({
        hour: targetHour,
        pm25: base.pm25,
        ...(base.pm10 !== undefined && { pm10: base.pm10 }),
        ...(base.no2 !== undefined && { no2: base.no2 }),
        ...(base.o3 !== undefined && { o3: base.o3 }),
      });
    }

    return result;
  }
}
