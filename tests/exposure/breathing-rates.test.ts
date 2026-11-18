import { describe, expect, it } from "vitest";
import { ACTIVITY_INTENSITY, breathingRateM3PerHour, rawRateM3PerMinute, type Intensity } from "@/lib/exposure/breathing-rates";
import { ACTIVITIES, AGE_BANDS } from "@/lib/types";

const INTENSITIES: Intensity[] = ["sleep", "sedentary", "light", "moderate", "high"];

describe("breathing rates", () => {
  it("matches the EPA Table 6-2 adult (31 to <41) row", () => {
    expect(rawRateM3PerMinute("adult", "sleep")).toBe(4.6e-3);
    expect(rawRateM3PerMinute("adult", "high")).toBe(4.9e-2);
  });

  it("matches the EPA Table 6-2 infant (birth to <1) row", () => {
    expect(rawRateM3PerMinute("infant", "sleep")).toBe(3.0e-3);
    expect(rawRateM3PerMinute("infant", "moderate")).toBe(1.4e-2);
  });

  it("converts per-minute rates to per-hour", () => {
    expect(breathingRateM3PerHour("adult", "commute_cycle")).toBeCloseTo(4.9e-2 * 60, 10);
  });

  it("gives every age band and intensity a positive, plausible rate", () => {
    for (const band of AGE_BANDS) {
      for (const intensity of INTENSITIES) {
        const rate = rawRateM3PerMinute(band, intensity);
        expect(rate).toBeGreaterThan(0);
        expect(rate).toBeLessThan(0.1);
      }
    }
  });

  it("orders intensities so harder activity never means less air", () => {
    for (const band of AGE_BANDS) {
      expect(rawRateM3PerMinute(band, "light")).toBeGreaterThan(rawRateM3PerMinute(band, "sedentary"));
      expect(rawRateM3PerMinute(band, "moderate")).toBeGreaterThan(rawRateM3PerMinute(band, "light"));
      expect(rawRateM3PerMinute(band, "high")).toBeGreaterThan(rawRateM3PerMinute(band, "moderate"));
    }
  });

  it("maps every activity to an intensity", () => {
    for (const activity of ACTIVITIES) expect(INTENSITIES).toContain(ACTIVITY_INTENSITY[activity]);
  });

  it("makes cycling breathe more air than walking, and walking more than resting", () => {
    const cycle = breathingRateM3PerHour("adult", "commute_cycle");
    const walk = breathingRateM3PerHour("adult", "commute_walk");
    const rest = breathingRateM3PerHour("adult", "rest_indoor");
    expect(cycle).toBeGreaterThan(walk);
    expect(walk).toBeGreaterThan(rest);
  });

  it("gives an infant a lower absolute breathing rate than an adult at the same activity", () => {
    expect(breathingRateM3PerHour("infant", "sleep")).toBeLessThan(breathingRateM3PerHour("adult", "sleep"));
  });
});
