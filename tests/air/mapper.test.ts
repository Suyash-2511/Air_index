import { describe, expect, it } from "vitest";
import {
  buildTodayForecast,
  convertConcentration,
  getLocalHour,
  mapCurrentConditions,
  mapForecast,
  PPB_TO_UGM3_FACTORS,
} from "@/lib/air/mapper";
import type { HourlyAir } from "@/lib/types";

describe("Air Quality Mapper", () => {
  it("converts ppb to µg/m³ correctly for NO2 and O3", () => {
    const no2Ugm3 = convertConcentration("no2", 10, "PARTS_PER_BILLION");
    expect(no2Ugm3).toBe(Math.round(10 * PPB_TO_UGM3_FACTORS.no2 * 100) / 100);
    expect(no2Ugm3).toBe(18.82);

    const o3Ugm3 = convertConcentration("o3", 10, "PARTS_PER_BILLION");
    expect(o3Ugm3).toBe(Math.round(10 * PPB_TO_UGM3_FACTORS.o3 * 100) / 100);
    expect(o3Ugm3).toBe(19.63);

    const pm25Val = convertConcentration("pm25", 145.5, "MICROGRAMS_PER_CUBIC_METER");
    expect(pm25Val).toBe(145.5);
  });

  it("maps realistic Google Air Quality API response with regional timezone", () => {
    const rawResponse = {
      dateTime: "2026-11-18T05:30:00Z",
      regionCode: "in",
      pollutants: [
        { code: "pm25", concentration: { value: 182.4, units: "MICROGRAMS_PER_CUBIC_METER" } },
        { code: "pm10", concentration: { value: 290.1, units: "MICROGRAMS_PER_CUBIC_METER" } },
        { code: "no2", concentration: { value: 40.0, units: "PARTS_PER_BILLION" } },
        { code: "o3", concentration: { value: 25.0, units: "PARTS_PER_BILLION" } },
      ],
    };

    // Region "in" -> Asia/Kolkata (UTC+5:30 -> 05:30Z is 11:00 AM local)
    const result = mapCurrentConditions(rawResponse);
    expect(result.hour).toBe(11);
    expect(result.pm25).toBe(182.4);
    expect(result.pm10).toBe(290.1);
    expect(result.no2).toBe(75.27);
    expect(result.o3).toBe(49.08);
    expect(result.timeZoneFallback).toBeUndefined();
  });

  it("marks timeZoneFallback when regionCode is unknown and falls back to UTC", () => {
    const rawResponse = {
      dateTime: "2026-11-18T08:00:00Z",
      regionCode: "xx", // unknown region
      pollutants: [{ code: "pm25", concentration: { value: 45.0, units: "MICROGRAMS_PER_CUBIC_METER" } }],
    };

    const result = mapCurrentConditions(rawResponse);
    expect(result.hour).toBe(8); // UTC hour
    expect(result.timeZoneFallback).toBe(true);
  });

  it("throws when current conditions response has no PM2.5 reading", () => {
    const rawResponse = {
      dateTime: "2026-11-18T04:00:00Z",
      regionCode: "in",
      pollutants: [{ code: "pm10", concentration: { value: 90, units: "MICROGRAMS_PER_CUBIC_METER" } }],
    };

    expect(() => mapCurrentConditions(rawResponse)).toThrow(/missing PM2.5/i);
  });

  it("drops forecast hours that lack PM2.5 instead of setting them to 0", () => {
    const rawForecast = {
      regionCode: "in",
      hourlyForecasts: [
        {
          dateTime: "2026-11-18T06:30:00Z",
          pollutants: [{ code: "pm25", concentration: { value: 110, units: "MICROGRAMS_PER_CUBIC_METER" } }],
        },
        {
          dateTime: "2026-11-18T07:30:00Z",
          pollutants: [{ code: "pm10", concentration: { value: 150, units: "MICROGRAMS_PER_CUBIC_METER" } }], // missing pm25
        },
        {
          dateTime: "2026-11-18T08:30:00Z",
          pollutants: [{ code: "pm25", concentration: { value: 130, units: "MICROGRAMS_PER_CUBIC_METER" } }],
        },
      ],
    };

    const result = mapForecast(rawForecast);
    expect(result).toHaveLength(2); // Hour with missing PM2.5 was dropped
    expect(result[0]?.pm25).toBe(110);
    expect(result[1]?.pm25).toBe(130);
  });

  it("buildTodayForecast preserves today's current hour and drops tomorrow's duplicate hour", () => {
    const current: HourlyAir = { hour: 11, pm25: 180 };
    const forecast: HourlyAir[] = [
      { hour: 12, pm25: 160 },
      { hour: 13, pm25: 140 },
      { hour: 11, pm25: 999 }, // tomorrow's 11:00 AM
      { hour: 14, pm25: 120 },
    ];

    const today = buildTodayForecast(current, forecast);
    expect(today[0]?.hour).toBe(11);
    expect(today[0]?.pm25).toBe(180); // Today's reading anchored

    // Tomorrow's hour 11 must not overwrite or appear in today's day sequence
    const hours = today.map((h) => h.hour);
    expect(hours).toEqual([11, 12, 13, 14]);
    const duplicate = today.find((h, i) => i > 0 && h.hour === 11);
    expect(duplicate).toBeUndefined();
  });

  it("resolves timezone with getLocalHour", () => {
    const inResolution = getLocalHour("2026-11-18T06:00:00Z", "in");
    expect(inResolution.hour).toBe(11); // 06:00 UTC + 5:30 -> 11:30 -> hour 11
    expect(inResolution.isFallback).toBe(false);

    const unknownResolution = getLocalHour("2026-11-18T06:00:00Z", "unknown-region");
    expect(unknownResolution.hour).toBe(6);
    expect(unknownResolution.isFallback).toBe(true);
  });
});
