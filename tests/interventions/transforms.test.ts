import { describe, expect, it } from "vitest";
import { cleanestStartHour, editHome, editWindows, MAX_SHIFT_HOURS } from "@/lib/interventions/transforms";
import { toForecast } from "@/lib/exposure/dose";
import type { ActivityWindow } from "@/lib/types";
import { cyclist, flatDay, household, smogDay } from "../fixtures/households";

const commute: ActivityWindow = { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 45, room: "living", mask: false };

describe("cleanestStartHour", () => {
  it("moves to the cleanest hour within the allowed shift", () => {
    const forecast = toForecast(Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: hour === 10 ? 50 : 300 })));
    expect(cleanestStartHour(commute, forecast)).toBe(10);
  });

  it("never shifts further than the limit", () => {
    const forecast = toForecast(Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: hour === 20 ? 1 : 300 })));
    const hour = cleanestStartHour(commute, forecast);
    expect(Math.abs(hour - commute.startHour)).toBeLessThanOrEqual(MAX_SHIFT_HOURS);
  });

  it("keeps the original hour when the air is the same all day", () => {
    expect(cleanestStartHour(commute, flatDay(200))).toBe(8);
  });

  it("finds a cleaner hour than the 8 am peak on a smog day", () => {
    expect(cleanestStartHour(commute, smogDay)).not.toBe(8);
  });
});

describe("editWindows / editHome", () => {
  it("returns null when nothing changes", () => {
    expect(editWindows(household([cyclist]), (w) => w)).toBeNull();
    expect(editHome(household([cyclist]), { windowHabit: "open_sometimes" })).toBeNull();
  });

  it("does not mutate the original household", () => {
    const original = household([cyclist]);
    const snapshot = JSON.stringify(original);
    editWindows(original, (w) => ({ ...w, mask: true }));
    editHome(original, { hasPurifier: true });
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
