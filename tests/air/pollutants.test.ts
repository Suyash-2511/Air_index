import { describe, expect, it } from "vitest";
import {
  CRITERIA_POLLUTANTS,
  getDominantPollutantInfo,
  getPollutantLimitRatio,
  POLLUTANT_INFO,
} from "@/lib/air/pollutants";

describe("Pollutants Metadata", () => {
  it("contains complete metadata for all 6 Indian criteria pollutants", () => {
    expect(CRITERIA_POLLUTANTS).toEqual(["pm25", "pm10", "no2", "o3", "co", "so2"]);

    for (const code of CRITERIA_POLLUTANTS) {
      const info = POLLUTANT_INFO[code];
      expect(info).toBeDefined();
      expect(info.nationalLimit).toBeGreaterThan(0);
      expect(info.name.length).toBeGreaterThan(3);
      expect(info.sources.length).toBeGreaterThan(10);
      expect(info.healthEffect.length).toBeGreaterThan(10);
      expect(info.atRisk.length).toBeGreaterThan(10);
    }
  });

  it("defines correct national limits and units according to NAAQS India", () => {
    expect(POLLUTANT_INFO.pm25.nationalLimit).toBe(60);
    expect(POLLUTANT_INFO.pm25.unit).toBe("µg/m³");
    expect(POLLUTANT_INFO.pm25.limitPeriod).toBe("24-hour");

    expect(POLLUTANT_INFO.pm10.nationalLimit).toBe(100);
    expect(POLLUTANT_INFO.pm10.unit).toBe("µg/m³");

    expect(POLLUTANT_INFO.no2.nationalLimit).toBe(80);
    expect(POLLUTANT_INFO.no2.unit).toBe("µg/m³");

    expect(POLLUTANT_INFO.o3.nationalLimit).toBe(100);
    expect(POLLUTANT_INFO.o3.limitPeriod).toBe("8-hour");

    expect(POLLUTANT_INFO.co.nationalLimit).toBe(2);
    expect(POLLUTANT_INFO.co.unit).toBe("mg/m³");
    expect(POLLUTANT_INFO.co.limitPeriod).toBe("8-hour");

    expect(POLLUTANT_INFO.so2.nationalLimit).toBe(80);
    expect(POLLUTANT_INFO.so2.unit).toBe("µg/m³");
  });

  it("calculates ratio against national limit accurately", () => {
    expect(getPollutantLimitRatio("pm25", 120)).toBe(2.0);
    expect(getPollutantLimitRatio("pm25", 90)).toBe(1.5);
    expect(getPollutantLimitRatio("co", 4.4)).toBe(2.2);
    expect(getPollutantLimitRatio("co", 0)).toBe(0);
  });

  it("resolves dominant pollutant metadata with normalization", () => {
    expect(getDominantPollutantInfo("PM2.5").code).toBe("pm25");
    expect(getDominantPollutantInfo("NO2").code).toBe("no2");
    expect(getDominantPollutantInfo("unknown").code).toBe("pm25");
  });
});
