import { describe, expect, it } from "vitest";
import { breathingRateM3PerHour } from "@/lib/exposure/breathing-rates";
import { dailyDose, doseForWindow, householdDose, minutesByHour, outdoorAt, toForecast } from "@/lib/exposure/dose";
import type { ActivityWindow } from "@/lib/types";
import { baseHome, cyclist, flatDay, grandmother, household, member } from "../fixtures/households";

const walk: ActivityWindow = { activity: "commute_walk", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false };

describe("minutesByHour", () => {
  it("splits a long window across clock hours", () => {
    expect(minutesByHour({ ...walk, durationMinutes: 150 })).toEqual([
      { hour: 8, minutes: 60 },
      { hour: 9, minutes: 60 },
      { hour: 10, minutes: 30 },
    ]);
  });

  it("wraps past midnight", () => {
    expect(minutesByHour({ ...walk, startHour: 23, durationMinutes: 90 }).map((s) => s.hour)).toEqual([23, 0]);
  });

  it("returns nothing for a zero-minute window", () => {
    expect(minutesByHour({ ...walk, durationMinutes: 0 })).toEqual([]);
  });
});

describe("outdoorAt", () => {
  it("falls back to the day's mean for a missing hour", () => {
    const forecast = toForecast([{ hour: 0, pm25: 100 }, { hour: 1, pm25: 300 }]);
    expect(outdoorAt(forecast, 5)).toBe(200);
  });

  it("returns zero for an empty forecast rather than NaN", () => {
    expect(outdoorAt(new Map(), 3)).toBe(0);
  });
});

describe("doseForWindow", () => {
  it("equals concentration × breathing rate × hours", () => {
    const dose = doseForWindow(walk, member(), flatDay(100), baseHome);
    expect(dose.total).toBeCloseTo(100 * breathingRateM3PerHour("adult", "commute_walk") * 1);
  });

  it("scales linearly with time", () => {
    const one = doseForWindow(walk, member(), flatDay(100), baseHome).total;
    const two = doseForWindow({ ...walk, durationMinutes: 120 }, member(), flatDay(100), baseHome).total;
    expect(two).toBeCloseTo(one * 2);
  });

  it("scales linearly with concentration", () => {
    const low = doseForWindow(walk, member(), flatDay(100), baseHome).total;
    const high = doseForWindow(walk, member(), flatDay(300), baseHome).total;
    expect(high).toBeCloseTo(low * 3);
  });

  it("stays finite and non-negative at extreme pollution", () => {
    const dose = doseForWindow(walk, member(), flatDay(1999), baseHome).total;
    expect(Number.isFinite(dose)).toBe(true);
    expect(dose).toBeGreaterThan(0);
  });
});

describe("dailyDose", () => {
  it("gives an infant and an adult different doses on the same schedule", () => {
    const schedule = [walk];
    const adult = dailyDose(member({ windows: schedule }), flatDay(200), baseHome);
    const infant = dailyDose(member({ ageBand: "infant", windows: schedule }), flatDay(200), baseHome);
    expect(infant.totalMicrograms).not.toBeCloseTo(adult.totalMicrograms);
  });

  it("makes the by-hour and by-activity breakdowns sum to the total", () => {
    const dose = dailyDose(cyclist, flatDay(150), baseHome);
    const byHour = dose.byHour.reduce((a, b) => a + b, 0);
    const byActivity = Object.values(dose.byActivity).reduce((a, b) => a + b, 0);
    expect(byHour).toBeCloseTo(dose.totalMicrograms);
    expect(byActivity).toBeCloseTo(dose.totalMicrograms);
  });

  it("always returns a 24-hour breakdown", () => {
    expect(dailyDose(cyclist, flatDay(150), baseHome).byHour).toHaveLength(24);
  });

  it("gives a cyclist more dose from commuting than an identical schedule by vehicle", () => {
    const byCar = member({ windows: cyclist.windows.map((w) => (w.activity === "commute_cycle" ? { ...w, activity: "commute_vehicle" as const, setting: "vehicle" as const } : w)) });
    expect(dailyDose(cyclist, flatDay(200), baseHome).totalMicrograms).toBeGreaterThan(dailyDose(byCar, flatDay(200), baseHome).totalMicrograms);
  });
});

describe("householdDose", () => {
  it("returns one breakdown per member, in order", () => {
    const doses = householdDose(household([cyclist, grandmother]), flatDay(200));
    expect(doses.map((d) => d.memberId)).toEqual(["cyclist", "grandmother"]);
  });
});
