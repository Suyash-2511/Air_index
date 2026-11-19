import { describe, expect, it } from "vitest";
import { fillScheduleGaps, isScheduleValid, validateSchedule } from "@/lib/exposure/schedule";
import type { ActivityWindow } from "@/lib/types";

describe("Schedule Gap Filling", () => {
  it("leaves an already full 1440m schedule unchanged with 0 filled minutes", () => {
    const full: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
      { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
    ];
    const result = fillScheduleGaps(full);
    expect(result.filledMinutes).toBe(0);
    expect(result.windows).toHaveLength(2);
    expect(isScheduleValid(result.windows)).toBe(true);
  });

  it("fills uncovered daytime hours with rest_indoor in living room", () => {
    // Only 8 hours of sleep from 22:00 to 06:00 (480 min). 960 minutes uncovered (06:00 to 22:00).
    const partial: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
    ];
    const result = fillScheduleGaps(partial);
    expect(result.filledMinutes).toBe(960);
    expect(result.windows).toHaveLength(2);

    const filled = result.windows.find((w) => w.activity === "rest_indoor");
    expect(filled).toBeDefined();
    expect(filled?.startHour).toBe(6);
    expect(filled?.durationMinutes).toBe(960);
    expect(filled?.room).toBe("living");
    expect(filled?.setting).toBe("indoor");

    expect(validateSchedule(result.windows)).toHaveLength(0);
    expect(isScheduleValid(result.windows)).toBe(true);
  });

  it("fills multiple gaps across the day including wrapping around midnight", () => {
    // Windows: 08:00 to 12:00 (240m) and 14:00 to 18:00 (240m).
    // Gaps: 12:00 to 14:00 (120m) and 18:00 to 08:00 (840m wrapping midnight).
    const segmented: ActivityWindow[] = [
      { activity: "light_indoor", setting: "indoor", startHour: 8, durationMinutes: 240, room: "living", mask: false },
      { activity: "light_indoor", setting: "indoor", startHour: 14, durationMinutes: 240, room: "living", mask: false },
    ];

    const result = fillScheduleGaps(segmented);
    expect(result.filledMinutes).toBe(960);
    expect(validateSchedule(result.windows)).toHaveLength(0);
    expect(isScheduleValid(result.windows)).toBe(true);

    const totalDuration = result.windows.reduce((sum, w) => sum + w.durationMinutes, 0);
    expect(totalDuration).toBe(1440);
  });

  it("extends the previous block for a gap that starts mid-hour instead of colliding with it", () => {
    const windows: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 600, room: "bedroom", mask: false },
      { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 30, room: "living", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 10, durationMinutes: 720, room: "living", mask: false },
    ];
    const { windows: filled } = fillScheduleGaps(windows);
    expect(validateSchedule(filled)).toEqual([]);
    expect(filled.reduce((sum, w) => sum + w.durationMinutes, 0)).toBe(1440);
  });
});

