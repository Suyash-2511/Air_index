import { describe, expect, it } from "vitest";
import {
  convertConcentration,
  getLocalHour,
  mapCurrentConditions,
  mapForecast,
  PPB_TO_UGM3_FACTORS,
} from "@/lib/air/mapper";

describe("Air Quality Mapper", () => {
  it("converts ppb to µg/m³ correctly for NO2 and O3", () => {
    // NO2 factor is ~1.8818
    const no2Ugm3 = convertConcentration("no2", 10, "PARTS_PER_BILLION");
    expect(no2Ugm3).toBe(Math.round(10 * PPB_TO_UGM3_FACTORS.no2 * 100) / 100);
    expect(no2Ugm3).toBe(18.82);

    // O3 factor is ~1.9632
    const o3Ugm3 = convertConcentration("o3", 10, "PARTS_PER_BILLION");
    expect(o3Ugm3).toBe(Math.round(10 * PPB_TO_UGM3_FACTORS.o3 * 100) / 100);
    expect(o3Ugm3).toBe(19.63);

    // Micrograms per cubic meter remains unchanged
    const pm25Val = convertConcentration("pm25", 145.5, "MICROGRAMS_PER_CUBIC_METER");
    expect(pm25Val).toBe(145.5);
  });

  it("maps realistic Google Air Quality API response", () => {
    const rawResponse = {
      dateTime: "2026-11-18T05:30:00Z",
      regionCode: "in",
      pollutants: [
        {
          code: "pm25",
          displayName: "PM2.5",
          concentration: { value: 182.4, units: "MICROGRAMS_PER_CUBIC_METER" },
        },
        {
          code: "pm10",
          displayName: "PM10",
          concentration: { value: 290.1, units: "MICROGRAMS_PER_CUBIC_METER" },
        },
        {
          code: "no2",
          displayName: "NO2",
          concentration: { value: 40.0, units: "PARTS_PER_BILLION" },
        },
        {
          code: "o3",
          displayName: "O3",
          concentration: { value: 25.0, units: "PARTS_PER_BILLION" },
        },
      ],
    };

    // Delhi coordinates: lat 28.61, lng 77.21 (UTC+5:30 -> 05:30Z is 11:00 AM local)
    const result = mapCurrentConditions(rawResponse, 28.61, 77.21);
    expect(result.hour).toBe(11);
    expect(result.pm25).toBe(182.4);
    expect(result.pm10).toBe(290.1);
    expect(result.no2).toBe(75.27);
    expect(result.o3).toBe(49.08);
  });

  it("handles missing optional pollutants gracefully", () => {
    const rawResponse = {
      dateTime: "2026-11-18T04:00:00Z",
      pollutants: [
        {
          code: "pm25",
          concentration: { value: 55.0, units: "MICROGRAMS_PER_CUBIC_METER" },
        },
      ],
    };

    const result = mapCurrentConditions(rawResponse, 28.61, 77.21);
    expect(result.pm25).toBe(55.0);
    expect(result.pm10).toBeUndefined();
    expect(result.no2).toBeUndefined();
    expect(result.o3).toBeUndefined();
  });

  it("handles empty pollutants by defaulting pm25 to 0", () => {
    const rawResponse = {
      dateTime: "2026-11-18T04:00:00Z",
      pollutants: [],
    };

    const result = mapCurrentConditions(rawResponse, 28.61, 77.21);
    expect(result.pm25).toBe(0);
  });

  it("throws on malformed response structure", () => {
    const malformed = {
      dateTime: 12345, // invalid type
      pollutants: "invalid",
    };

    expect(() => mapCurrentConditions(malformed, 28.61, 77.21)).toThrow();
  });

  it("maps forecast response and limits to requested hours", () => {
    const rawForecast = {
      hourlyForecasts: [
        {
          dateTime: "2026-11-18T04:30:00Z",
          pollutants: [
            { code: "pm25", concentration: { value: 110, units: "MICROGRAMS_PER_CUBIC_METER" } },
          ],
        },
        {
          dateTime: "2026-11-18T05:30:00Z",
          pollutants: [
            { code: "pm25", concentration: { value: 120, units: "MICROGRAMS_PER_CUBIC_METER" } },
          ],
        },
        {
          dateTime: "2026-11-18T06:30:00Z",
          pollutants: [
            { code: "pm25", concentration: { value: 130, units: "MICROGRAMS_PER_CUBIC_METER" } },
          ],
        },
      ],
    };

    const result = mapForecast(rawForecast, 28.61, 77.21, 2);
    expect(result).toHaveLength(2);
    const first = result[0];
    const second = result[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) throw new Error("Missing items");
    expect(first.hour).toBe(10);
    expect(first.pm25).toBe(110);
    expect(second.hour).toBe(11);
    expect(second.pm25).toBe(120);
  });

  it("maps local hour accurately across timezones", () => {
    // Delhi (UTC+5:30): 00:00 UTC is 05:30 -> hour 5
    expect(getLocalHour("2026-11-18T00:00:00Z", 28.61, 77.21)).toBe(5);

    // Offset string embedded in ISO
    expect(getLocalHour("2026-11-18T14:20:00+05:30", 28.61, 77.21)).toBe(14);
  });
});
