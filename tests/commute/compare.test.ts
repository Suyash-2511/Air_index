import { describe, expect, it } from "vitest";
import { compareCommuteModes } from "@/lib/commute/compare";

describe("compareCommuteModes", () => {
  it("compares 6 commute modes for 8 km at 200 µg/m³ PM2.5", () => {
    const result = compareCommuteModes({
      distanceKm: 8,
      outdoorPm25: 200,
      ageBand: "adult",
    });

    expect(result.modes.length).toBe(6);
    expect(result.distanceKm).toBe(8);

    // Metro has fast speed (32 km/h -> 15 min), sealed cabin (0.6) and low dose
    const metro = result.modes.find((m) => m.mode === "metro");
    expect(metro).toBeDefined();
    expect(metro?.durationMin).toBe(15);
    expect(metro?.co2Grams).toBe(128); // 8 * 16

    // Walking takes 107 min, cycling takes 32 min with high breathing rate
    const walk = result.modes.find((m) => m.mode === "walk");
    expect(walk?.co2Grams).toBe(0);
    expect(walk?.durationMin).toBeGreaterThan(100);

    const cycle = result.modes.find((m) => m.mode === "cycle");
    expect(cycle?.co2Grams).toBe(0);

    // Modes are sorted ascending by inhaled micrograms
    for (let i = 0; i < result.modes.length - 1; i++) {
      expect(result.modes[i]!.inhaledMicrograms).toBeLessThanOrEqual(result.modes[i + 1]!.inhaledMicrograms);
    }

    expect(result.bestForLungs).toBeDefined();
    expect(result.bestForCity).toBeDefined();
    expect(result.bestForCity.co2Grams).toBe(0);
  });

  it("clamps distance within safe bounds", () => {
    const clampedShort = compareCommuteModes({ distanceKm: 0.1, outdoorPm25: 100 });
    expect(clampedShort.distanceKm).toBe(0.5);

    const clampedLong = compareCommuteModes({ distanceKm: 120, outdoorPm25: 100 });
    expect(clampedLong.distanceKm).toBe(50);
  });
});
