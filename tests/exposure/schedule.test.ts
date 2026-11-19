import { describe, expect, it } from "vitest";
import {
  getDefaultScheduleForAgeBand,
  isScheduleValid,
  validateSchedule,
} from "@/lib/exposure/schedule";
import type { ActivityWindow } from "@/lib/types";

describe("Schedule Validation & Integrity", () => {
  it("passes when schedule has exactly 24 hours (1440m) without overlap", () => {
    const validWindows: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
      { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
    ];

    const problems = validateSchedule(validWindows);
    expect(problems).toHaveLength(0);
    expect(isScheduleValid(validWindows)).toBe(true);
  });

  it("fails when total duration exceeds 24 hours (e.g. 1440m + 1m)", () => {
    const overDuration: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 0, durationMinutes: 1441, room: "bedroom", mask: false },
    ];

    const problems = validateSchedule(overDuration);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.includes("longer than 24 hours"))).toBe(true);
  });

  it("detects overlap across midnight wrap correctly", () => {
    // Window 1: 22:00 to 06:00 (wraps past midnight)
    // Window 2: 04:00 to 08:00 (overlaps between 04:00 and 06:00)
    const overlapping: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 4, durationMinutes: 240, room: "living", mask: false },
    ];

    const problems = validateSchedule(overlapping);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.includes("overlaps"))).toBe(true);
  });

  it("reproduces and rejects the 32-hour corrupt schedule from the Phase 2 live run", () => {
    // Mother's windows from live run:
    // Window 1: sleep at 22:00 for 480m (22:00 -> 06:00)
    // Window 2: rest_indoor at 08:00 for 960m (08:00 -> 24:00)
    // Window 3: light_indoor at 00:00 for 480m (00:00 -> 08:00)
    // Total = 480 + 960 + 480 = 1920m (32 hours!), overlapping with window 1
    const corruptLiveWindows: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "living", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 8, durationMinutes: 960, room: "living", mask: false },
      { activity: "light_indoor", setting: "indoor", startHour: 0, durationMinutes: 480, room: "living", mask: false },
    ];

    const problems = validateSchedule(corruptLiveWindows);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.includes("adds up to 32 hr, 8 hr longer than 24 hours"))).toBe(true);
    expect(problems.some((p) => p.includes("overlaps"))).toBe(true);
    expect(isScheduleValid(corruptLiveWindows)).toBe(false);
  });

  it("generates guaranteed valid default schedules with commute integration", () => {
    const commute: ActivityWindow = {
      activity: "commute_cycle",
      setting: "outdoor",
      startHour: 8,
      durationMinutes: 60,
      room: "living",
      mask: false,
    };

    const schedule = getDefaultScheduleForAgeBand("adult", commute);
    expect(validateSchedule(schedule)).toHaveLength(0);

    const totalMinutes = schedule.reduce((sum, w) => sum + w.durationMinutes, 0);
    expect(totalMinutes).toBe(1440);
  });
});
