import type { HourlyAir, Location } from "../types";
import { calculateIndiaAqi } from "./india-aqi";
import type { AirProvider } from "./provider";

/** Illustrative deterministic 24-hour winter smog profile for New Delhi. */
const DELHI_SEVERE_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 240, pm10: 380, no2: 65, o3: 20, co: 2.1, so2: 24 },
  { hour: 1, pm25: 250, pm10: 395, no2: 68, o3: 18, co: 2.2, so2: 25 },
  { hour: 2, pm25: 260, pm10: 410, no2: 70, o3: 16, co: 2.3, so2: 26 },
  { hour: 3, pm25: 270, pm10: 425, no2: 72, o3: 15, co: 2.4, so2: 28 },
  { hour: 4, pm25: 265, pm10: 420, no2: 75, o3: 14, co: 2.3, so2: 27 },
  { hour: 5, pm25: 275, pm10: 435, no2: 80, o3: 15, co: 2.5, so2: 29 },
  { hour: 6, pm25: 290, pm10: 460, no2: 88, o3: 18, co: 2.8, so2: 32 },
  { hour: 7, pm25: 320, pm10: 510, no2: 95, o3: 22, co: 3.2, so2: 35 },
  { hour: 8, pm25: 350, pm10: 560, no2: 105, o3: 28, co: 3.6, so2: 38 },
  { hour: 9, pm25: 365, pm10: 580, no2: 100, o3: 35, co: 3.5, so2: 36 },
  { hour: 10, pm25: 330, pm10: 520, no2: 85, o3: 45, co: 3.0, so2: 30 },
  { hour: 11, pm25: 280, pm10: 440, no2: 72, o3: 52, co: 2.6, so2: 25 },
  { hour: 12, pm25: 230, pm10: 360, no2: 60, o3: 58, co: 2.1, so2: 22 },
  { hour: 13, pm25: 190, pm10: 300, no2: 52, o3: 62, co: 1.8, so2: 19 },
  { hour: 14, pm25: 160, pm10: 250, no2: 48, o3: 65, co: 1.6, so2: 18 },
  { hour: 15, pm25: 175, pm10: 275, no2: 54, o3: 60, co: 1.7, so2: 19 },
  { hour: 16, pm25: 200, pm10: 315, no2: 62, o3: 50, co: 2.0, so2: 22 },
  { hour: 17, pm25: 250, pm10: 395, no2: 75, o3: 38, co: 2.5, so2: 26 },
  { hour: 18, pm25: 290, pm10: 460, no2: 90, o3: 28, co: 3.0, so2: 31 },
  { hour: 19, pm25: 320, pm10: 510, no2: 98, o3: 24, co: 3.3, so2: 34 },
  { hour: 20, pm25: 340, pm10: 540, no2: 94, o3: 22, co: 3.2, so2: 33 },
  { hour: 21, pm25: 325, pm10: 515, no2: 86, o3: 20, co: 2.9, so2: 30 },
  { hour: 22, pm25: 295, pm10: 470, no2: 78, o3: 20, co: 2.6, so2: 27 },
  { hour: 23, pm25: 265, pm10: 420, no2: 70, o3: 20, co: 2.3, so2: 25 },
];

/** Illustrative deterministic 24-hour moderate winter profile for Mumbai. */
const MUMBAI_MODERATE_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 65, pm10: 95, no2: 35, o3: 22, co: 1.0, so2: 14 },
  { hour: 1, pm25: 68, pm10: 98, no2: 36, o3: 20, co: 1.0, so2: 14 },
  { hour: 2, pm25: 70, pm10: 102, no2: 38, o3: 18, co: 1.1, so2: 15 },
  { hour: 3, pm25: 72, pm10: 105, no2: 40, o3: 16, co: 1.1, so2: 15 },
  { hour: 4, pm25: 75, pm10: 110, no2: 42, o3: 16, co: 1.2, so2: 16 },
  { hour: 5, pm25: 78, pm10: 114, no2: 45, o3: 18, co: 1.2, so2: 16 },
  { hour: 6, pm25: 84, pm10: 122, no2: 52, o3: 20, co: 1.3, so2: 17 },
  { hour: 7, pm25: 95, pm10: 138, no2: 60, o3: 24, co: 1.5, so2: 19 },
  { hour: 8, pm25: 115, pm10: 168, no2: 72, o3: 30, co: 1.8, so2: 22 },
  { hour: 9, pm25: 120, pm10: 175, no2: 70, o3: 36, co: 1.8, so2: 22 },
  { hour: 10, pm25: 105, pm10: 152, no2: 58, o3: 42, co: 1.6, so2: 20 },
  { hour: 11, pm25: 80, pm10: 116, no2: 45, o3: 48, co: 1.3, so2: 18 },
  { hour: 12, pm25: 65, pm10: 94, no2: 38, o3: 54, co: 1.1, so2: 16 },
  { hour: 13, pm25: 50, pm10: 72, no2: 32, o3: 58, co: 0.9, so2: 14 },
  { hour: 14, pm25: 42, pm10: 60, no2: 28, o3: 60, co: 0.8, so2: 12 },
  { hour: 15, pm25: 45, pm10: 65, no2: 30, o3: 56, co: 0.8, so2: 13 },
  { hour: 16, pm25: 55, pm10: 80, no2: 36, o3: 48, co: 1.0, so2: 14 },
  { hour: 17, pm25: 70, pm10: 102, no2: 46, o3: 38, co: 1.2, so2: 16 },
  { hour: 18, pm25: 85, pm10: 124, no2: 58, o3: 30, co: 1.4, so2: 18 },
  { hour: 19, pm25: 98, pm10: 142, no2: 64, o3: 26, co: 1.6, so2: 20 },
  { hour: 20, pm25: 102, pm10: 148, no2: 60, o3: 24, co: 1.5, so2: 19 },
  { hour: 21, pm25: 95, pm10: 138, no2: 52, o3: 24, co: 1.4, so2: 18 },
  { hour: 22, pm25: 82, pm10: 118, no2: 44, o3: 23, co: 1.2, so2: 16 },
  { hour: 23, pm25: 72, pm10: 104, no2: 38, o3: 22, co: 1.1, so2: 15 },
];

/** Illustrative deterministic 24-hour clean profile for Nashik. */
const NASHIK_CLEAN_WINTER_FIXTURE: readonly HourlyAir[] = [
  { hour: 0, pm25: 22, pm10: 32, no2: 14, o3: 20, co: 0.5, so2: 8 },
  { hour: 1, pm25: 24, pm10: 35, no2: 15, o3: 18, co: 0.5, so2: 8 },
  { hour: 2, pm25: 25, pm10: 36, no2: 16, o3: 16, co: 0.5, so2: 8 },
  { hour: 3, pm25: 26, pm10: 38, no2: 16, o3: 15, co: 0.6, so2: 9 },
  { hour: 4, pm25: 28, pm10: 40, no2: 18, o3: 15, co: 0.6, so2: 9 },
  { hour: 5, pm25: 30, pm10: 44, no2: 20, o3: 16, co: 0.6, so2: 10 },
  { hour: 6, pm25: 34, pm10: 50, no2: 24, o3: 18, co: 0.7, so2: 11 },
  { hour: 7, pm25: 38, pm10: 55, no2: 28, o3: 22, co: 0.8, so2: 12 },
  { hour: 8, pm25: 48, pm10: 70, no2: 35, o3: 26, co: 0.9, so2: 13 },
  { hour: 9, pm25: 52, pm10: 76, no2: 34, o3: 30, co: 0.9, so2: 13 },
  { hour: 10, pm25: 44, pm10: 64, no2: 28, o3: 35, co: 0.8, so2: 11 },
  { hour: 11, pm25: 32, pm10: 46, no2: 22, o3: 40, co: 0.7, so2: 10 },
  { hour: 12, pm25: 25, pm10: 36, no2: 18, o3: 44, co: 0.6, so2: 9 },
  { hour: 13, pm25: 18, pm10: 26, no2: 14, o3: 48, co: 0.5, so2: 7 },
  { hour: 14, pm25: 15, pm10: 22, no2: 12, o3: 50, co: 0.4, so2: 6 },
  { hour: 15, pm25: 16, pm10: 24, no2: 14, o3: 46, co: 0.5, so2: 7 },
  { hour: 16, pm25: 20, pm10: 30, no2: 16, o3: 40, co: 0.5, so2: 8 },
  { hour: 17, pm25: 26, pm10: 38, no2: 22, o3: 34, co: 0.6, so2: 9 },
  { hour: 18, pm25: 34, pm10: 50, no2: 28, o3: 28, co: 0.7, so2: 11 },
  { hour: 19, pm25: 40, pm10: 58, no2: 32, o3: 24, co: 0.8, so2: 12 },
  { hour: 20, pm25: 42, pm10: 62, no2: 30, o3: 22, co: 0.8, so2: 12 },
  { hour: 21, pm25: 38, pm10: 55, no2: 26, o3: 22, co: 0.7, so2: 11 },
  { hour: 22, pm25: 30, pm10: 44, no2: 20, o3: 21, co: 0.6, so2: 9 },
  { hour: 23, pm25: 25, pm10: 36, no2: 16, o3: 20, co: 0.5, so2: 8 },
];

/** Selects the closest regional fixture dataset based on coordinates. */
function getClosestFixture(location: Location): readonly HourlyAir[] {
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
    if (d < minDistance) { minDistance = d; best = t; }
  }
  return best.data;
}

function enrichWithAqi(base: HourlyAir): HourlyAir {
  const aqi = base.aqi ?? calculateIndiaAqi({
    pm25: base.pm25, pm10: base.pm10, no2: base.no2, o3: base.o3, co: base.co, so2: base.so2,
  });
  return { ...base, aqi };
}

/** Offline air quality provider serving deterministic illustrative Indian winter data. */
export class FixtureAirProvider implements AirProvider {
  async current(location: Location): Promise<HourlyAir> {
    const series = getClosestFixture(location);
    const hour = new Date().getHours() % 24;
    const fallback: HourlyAir = series[0] ?? { hour: 0, pm25: 100 };
    return enrichWithAqi(series[hour] ?? fallback);
  }

  async forecast(location: Location, hours: number): Promise<HourlyAir[]> {
    const series = getClosestFixture(location);
    const startHour = new Date().getHours() % 24;
    const result: HourlyAir[] = [];
    const count = Math.max(1, hours);
    const fallback: HourlyAir = series[0] ?? { hour: 0, pm25: 100 };

    for (let i = 0; i < count; i += 1) {
      const targetHour = (startHour + i) % 24;
      const base = series[targetHour] ?? fallback;
      result.push(enrichWithAqi({ ...base, hour: targetHour }));
    }
    return result;
  }
}
