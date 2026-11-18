import { describe, expect, it } from "vitest";
import { convertPollutantConcentration, ppbToMicrograms, ppbToMilligramsCo } from "@/lib/air/units";

describe("air units conversion", () => {
  it("converts NO2, O3, and SO2 from ppb to µg/m³ at 25 °C accurately", () => {
    // NO2: 100 ppb * 46.01 / 24.45 = 188.18 µg/m³
    expect(ppbToMicrograms(100, 46.01)).toBe(188.18);
    expect(convertPollutantConcentration("no2", 100, "PARTS_PER_BILLION")).toBe(188.18);

    // O3: 50 ppb * 48.00 / 24.45 = 98.16 µg/m³
    expect(ppbToMicrograms(50, 48.0)).toBe(98.16);
    expect(convertPollutantConcentration("o3", 50, "PARTS_PER_BILLION")).toBe(98.16);

    // SO2: 20 ppb * 64.07 / 24.45 = 52.41 µg/m³
    expect(ppbToMicrograms(20, 64.07)).toBe(52.41);
    expect(convertPollutantConcentration("so2", 20, "PARTS_PER_BILLION")).toBe(52.41);
  });

  it("converts CO from ppb to mg/m³ at 25 °C accurately", () => {
    // CO: 1500 ppb * 28.01 / 24.45 / 1000 = 1.72 mg/m³
    expect(ppbToMilligramsCo(1500)).toBe(1.72);
    expect(convertPollutantConcentration("co", 1500, "PARTS_PER_BILLION")).toBe(1.72);
    expect(convertPollutantConcentration("co", 2.5, "MILLIGRAMS_PER_CUBIC_METER")).toBe(2.5);
    expect(convertPollutantConcentration("co", 3000, "MICROGRAMS_PER_CUBIC_METER")).toBe(3.0);
  });

  it("preserves PM2.5 and PM10 values in µg/m³", () => {
    expect(convertPollutantConcentration("pm25", 145.67, "MICROGRAMS_PER_CUBIC_METER")).toBe(145.67);
    expect(convertPollutantConcentration("pm10", 220.4, "MICROGRAMS_PER_CUBIC_METER")).toBe(220.4);
  });

  it("safely handles negative or invalid numeric inputs", () => {
    expect(convertPollutantConcentration("no2", -10, "PARTS_PER_BILLION")).toBe(0);
    expect(convertPollutantConcentration("co", NaN, "PARTS_PER_BILLION")).toBe(0);
    expect(ppbToMicrograms(-50, 46.01)).toBe(0);
    expect(ppbToMilligramsCo(-1000)).toBe(0);
  });
});
