import { describe, expect, it } from "vitest";
import {
  COOKING_INCREMENT,
  INFILTRATION_BY_WINDOW_HABIT,
  MASK_PASS_THROUGH,
  PURIFIER_ROOM_FACTOR,
  VEHICLE_CABIN_FACTOR,
  concentrationFor,
} from "@/lib/exposure/infiltration";
import type { ActivityWindow } from "@/lib/types";
import { baseHome } from "../fixtures/households";

const indoor: ActivityWindow = { activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 60, room: "living", mask: false };
const outdoor: ActivityWindow = { ...indoor, activity: "commute_walk", setting: "outdoor" };

describe("concentrationFor", () => {
  it("returns outdoor air unchanged outdoors", () => {
    expect(concentrationFor(outdoor, 200, baseHome)).toBe(200);
  });

  it("applies the cabin factor in a vehicle", () => {
    expect(concentrationFor({ ...outdoor, setting: "vehicle" }, 200, baseHome)).toBeCloseTo(200 * VEHICLE_CABIN_FACTOR);
  });

  it("applies the window-habit infiltration factor indoors", () => {
    expect(concentrationFor(indoor, 200, baseHome)).toBeCloseTo(200 * INFILTRATION_BY_WINDOW_HABIT.open_sometimes);
  });

  it("lets less smog in when windows are kept closed", () => {
    const closed = concentrationFor(indoor, 200, { ...baseHome, windowHabit: "kept_closed" });
    const open = concentrationFor(indoor, 200, { ...baseHome, windowHabit: "open_often" });
    expect(closed).toBeLessThan(open);
  });

  it("cuts indoor air only in the room the purifier is in", () => {
    const home = { ...baseHome, hasPurifier: true, purifierRoom: "bedroom" as const };
    const bedroom = concentrationFor({ ...indoor, room: "bedroom" }, 200, home);
    const living = concentrationFor(indoor, 200, home);
    expect(bedroom).toBeCloseTo(living * PURIFIER_ROOM_FACTOR);
  });

  it("adds cooking smoke only to the cooking window", () => {
    const home = { ...baseHome, cookingFuel: "biomass" as const };
    const cooking = concentrationFor({ ...indoor, activity: "cooking" }, 100, home);
    const resting = concentrationFor(indoor, 100, home);
    expect(cooking - resting).toBeCloseTo(COOKING_INCREMENT.biomass);
  });

  it("halves cooking smoke with an exhaust fan", () => {
    const cookingWindow = { ...indoor, activity: "cooking" as const };
    const without = concentrationFor(cookingWindow, 0, { ...baseHome, cookingFuel: "biomass" });
    const withFan = concentrationFor(cookingWindow, 0, { ...baseHome, cookingFuel: "biomass", hasExhaustFan: true });
    expect(withFan).toBeCloseTo(without / 2);
  });

  it("adds indoor smoking to indoor air", () => {
    const smoky = concentrationFor(indoor, 100, { ...baseHome, smokingIndoors: true });
    expect(smoky).toBeGreaterThan(concentrationFor(indoor, 100, baseHome));
  });

  it("applies a mask outdoors but ignores it indoors", () => {
    expect(concentrationFor({ ...outdoor, mask: true }, 200, baseHome)).toBeCloseTo(200 * MASK_PASS_THROUGH);
    expect(concentrationFor({ ...indoor, mask: true }, 200, baseHome)).toBe(concentrationFor(indoor, 200, baseHome));
  });

  it("never returns a negative concentration for bad input", () => {
    expect(concentrationFor(outdoor, -50, baseHome)).toBe(0);
  });

  it("keeps every coefficient within a physically sensible range", () => {
    for (const f of Object.values(INFILTRATION_BY_WINDOW_HABIT)) {
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    }
    expect(VEHICLE_CABIN_FACTOR).toBeGreaterThan(0);
    expect(VEHICLE_CABIN_FACTOR).toBeLessThanOrEqual(1);
    expect(PURIFIER_ROOM_FACTOR).toBeGreaterThan(0);
    expect(PURIFIER_ROOM_FACTOR).toBeLessThan(1);
    expect(MASK_PASS_THROUGH).toBeGreaterThan(0);
    expect(MASK_PASS_THROUGH).toBeLessThan(1);
  });
});
