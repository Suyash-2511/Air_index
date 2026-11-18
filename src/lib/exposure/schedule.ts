import type { ActivityWindow, AgeBand } from "../types";

/** Total minutes in a 24-hour day. */
export const MINUTES_IN_DAY = 1440;

/**
 * Validates a household member's activity windows for schedule integrity.
 * Detects overlapping windows (including those wrapping across midnight)
 * and schedules exceeding the 1440-minute (24-hour) daily limit.
 * Returns an array of human-readable problem descriptions, empty if valid.
 */
export function validateSchedule(windows: readonly ActivityWindow[]): string[] {
  const problems: string[] = [];

  if (!windows || windows.length === 0) {
    return ["Schedule must have at least one activity window."];
  }

  let totalMinutes = 0;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (!w) continue;
    if (w.durationMinutes <= 0) {
      problems.push(`Window ${i + 1} (${w.activity}) has non-positive duration (${w.durationMinutes}m).`);
    } else if (w.durationMinutes > MINUTES_IN_DAY) {
      problems.push(`Window ${i + 1} (${w.activity}) duration (${w.durationMinutes}m) exceeds 24 hours.`);
    }
    totalMinutes += w.durationMinutes;
  }

  if (totalMinutes > MINUTES_IN_DAY) {
    problems.push(
      `Total schedule duration is ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)}h), exceeding the 1440-minute (24-hour) maximum.`,
    );
  }

  // Minute-by-minute occupancy grid to catch overlaps including midnight wraps
  const minuteOwners = new Int16Array(MINUTES_IN_DAY).fill(-1);

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (!w || w.durationMinutes <= 0) continue;

    const startMinute = ((w.startHour * 60) % MINUTES_IN_DAY + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const duration = Math.min(w.durationMinutes, MINUTES_IN_DAY);

    for (let m = 0; m < duration; m++) {
      const currentMinute = (startMinute + m) % MINUTES_IN_DAY;
      const existingOwner = minuteOwners[currentMinute];

      if (existingOwner !== undefined && existingOwner !== -1 && existingOwner !== i) {
        const prior = windows[existingOwner];
        const priorLabel = prior ? prior.activity : `Window ${existingOwner + 1}`;
        problems.push(
          `Window ${i + 1} (${w.activity} at ${w.startHour}:00 for ${w.durationMinutes}m) overlaps with Window ${existingOwner + 1} (${priorLabel}).`,
        );
        break; // Report one overlap problem per offending window pair
      }

      minuteOwners[currentMinute] = i;
    }
  }

  return problems;
}

/**
 * Returns true if a member's schedule contains no overlaps and does not exceed 1440 minutes.
 */
export function isScheduleValid(windows: readonly ActivityWindow[]): boolean {
  return validateSchedule(windows).length === 0;
}

/**
 * Generates a standard, guaranteed-valid 24-hour non-overlapping schedule (1440 minutes)
 * for a member based on age band and optional stated commute window.
 */
export function getDefaultScheduleForAgeBand(
  ageBand: AgeBand,
  commuteWindow?: ActivityWindow,
): ActivityWindow[] {
  // Infant/Child schedule
  if (ageBand === "infant" || ageBand === "child") {
    return [
      { activity: "sleep", setting: "indoor", startHour: 20, durationMinutes: 600, room: "bedroom", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 840, room: "living", mask: false },
    ];
  }

  // If a commute window was provided (e.g. cycle/walk to work), integrate it seamlessly
  if (commuteWindow) {
    const cStart = commuteWindow.startHour;
    const cDur = Math.min(commuteWindow.durationMinutes, 180);
    const cEnd = (cStart * 60 + cDur) % MINUTES_IN_DAY;
    const cEndHour = Math.floor(cEnd / 60);

    const sleepStartHour = 22;
    const sleepDur = 480; // 22:00 to 06:00
    const wakeHour = 6;

    // Build timeline: 06:00 -> cStart, cStart -> cEndHour, cEndHour -> 22:00, 22:00 -> 06:00
    const morningDur = Math.max(0, (cStart - wakeHour) * 60);
    const eveningDur = Math.max(0, (sleepStartHour - cEndHour) * 60);

    const windows: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: sleepStartHour, durationMinutes: sleepDur, room: "bedroom", mask: false },
    ];

    if (morningDur > 0) {
      windows.push({
        activity: "light_indoor",
        setting: "indoor",
        startHour: wakeHour,
        durationMinutes: morningDur,
        room: "living",
        mask: false,
      });
    }

    windows.push({
      ...commuteWindow,
      durationMinutes: cDur,
    });

    if (eveningDur > 0) {
      windows.push({
        activity: "light_indoor",
        setting: "indoor",
        startHour: cEndHour,
        durationMinutes: eveningDur,
        room: "living",
        mask: false,
      });
    }

    // Verify it sums to 1440; if not due to custom hour alignment, fall back to robust split
    const currentSum = windows.reduce((sum, w) => sum + w.durationMinutes, 0);
    if (currentSum === MINUTES_IN_DAY && isScheduleValid(windows)) {
      return windows;
    }
  }

  // Standard adult / older adult default 24h schedule
  return [
    { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
    { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
  ];
}
