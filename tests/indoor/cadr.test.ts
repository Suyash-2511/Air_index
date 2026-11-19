import { describe, expect, it } from "vitest";
import { calculatePurifierSizing } from "@/lib/indoor/cadr";

describe("calculatePurifierSizing", () => {
  it("calculates CADR and steady-state PM2.5 reduction for a bedroom on smog days", () => {
    const result = calculatePurifierSizing({
      room: { lengthM: 3, widthM: 3.5, heightM: 2.8 },
      targetAch: 4.8,
      outdoorPm25: 200,
      windowHabit: "kept_closed",
    });

    expect(result.volumeM3).toBe(29.4);
    expect(result.cadrM3h).toBe(141);
    expect(result.cadrCfm).toBe(83);
    expect(result.indoorWithout).toBe(90);
    expect(result.indoorWith).toBe(11.5);
    expect(result.minutesToClean).toBe(12.5);
  });

  it("handles normal days with lower 2.0 ACH target", () => {
    const result = calculatePurifierSizing({
      room: { lengthM: 4, widthM: 5, heightM: 2.8 },
      targetAch: 2.0,
      outdoorPm25: 100,
      windowHabit: "kept_closed",
    });

    expect(result.volumeM3).toBe(56);
    expect(result.cadrM3h).toBe(112);
    expect(result.cadrCfm).toBe(66);
    expect(result.indoorWithout).toBe(45);
    expect(result.indoorWith).toBe(11.7);
    expect(result.minutesToClean).toBe(30);
  });

  it("reflects higher baseline when windows are open often", () => {
    const closed = calculatePurifierSizing({
      room: { lengthM: 3, widthM: 3, heightM: 2.8 },
      targetAch: 4.8,
      outdoorPm25: 150,
      windowHabit: "kept_closed",
    });

    const open = calculatePurifierSizing({
      room: { lengthM: 3, widthM: 3, heightM: 2.8 },
      targetAch: 4.8,
      outdoorPm25: 150,
      windowHabit: "open_often",
    });

    expect(open.indoorWithout).toBeGreaterThan(closed.indoorWithout);
    expect(open.indoorWith).toBeGreaterThan(closed.indoorWith);
  });
});
