import { formatClock } from "../format/time";
import type { ActivityWindow, AgeBand } from "../types";

/** Total minutes in a 24-hour day. */
export const MINUTES_IN_DAY = 1440;

/** Plain wording for a block, e.g. "Cycling at 8 AM", used in schedule messages people read. */
function describe(w: ActivityWindow): string {
  const clock = formatClock(w.startHour);
  const name = w.activity.replace(/_/g, " ");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} at ${clock}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Validates a household member's activity windows for schedule integrity.
 * Detects overlapping windows (including midnight wraps) and schedules > 1440m.
 */
export function validateSchedule(windows: readonly ActivityWindow[]): string[] {
  const problems: string[] = [];
  if (!windows || windows.length === 0) return ["Add at least one block to this day."];

  let totalMinutes = 0;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (!w) continue;
    if (w.durationMinutes <= 0) {
      problems.push(`${describe(w)} needs a length.`);
    } else if (w.durationMinutes > MINUTES_IN_DAY) {
      problems.push(`${describe(w)} is longer than a whole day.`);
    }
    totalMinutes += w.durationMinutes;
  }

  if (totalMinutes > MINUTES_IN_DAY) {
    const extra = (totalMinutes - MINUTES_IN_DAY) / 60;
    problems.push(
      `This day adds up to ${+(totalMinutes / 60).toFixed(1)} hr, ${+extra.toFixed(1)} hr longer than 24 hours. Shorten a block.`,
    );
  }

  const minuteOwners = new Int16Array(MINUTES_IN_DAY).fill(-1);
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (!w || w.durationMinutes <= 0) continue;
    const start = ((w.startHour * 60) % MINUTES_IN_DAY + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const dur = Math.min(w.durationMinutes, MINUTES_IN_DAY);

    for (let m = 0; m < dur; m++) {
      const cur = (start + m) % MINUTES_IN_DAY;
      const owner = minuteOwners[cur];
      if (owner !== undefined && owner !== -1 && owner !== i) {
        const prior = windows[owner];
        problems.push(`${describe(w)} overlaps ${prior ? lowerFirst(describe(prior)) : "another block"}. Move or shorten one.`);
        break;
      }
      minuteOwners[cur] = i;
    }
  }

  return problems;
}

/** Returns true if a member's schedule contains no overlaps and does not exceed 1440 minutes. */
export function isScheduleValid(windows: readonly ActivityWindow[]): boolean {
  return validateSchedule(windows).length === 0;
}

/**
 * Generates a standard, guaranteed-valid 24-hour non-overlapping schedule (1440 minutes)
 * for a member based on age band and optional stated commute window.
 */
export function getDefaultScheduleForAgeBand(ageBand: AgeBand, commuteWindow?: ActivityWindow): ActivityWindow[] {
  if (ageBand === "infant" || ageBand === "child") {
    return [
      { activity: "sleep", setting: "indoor", startHour: 20, durationMinutes: 600, room: "bedroom", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 840, room: "living", mask: false },
    ];
  }

  if (commuteWindow) {
    const cStart = commuteWindow.startHour;
    const cDur = Math.min(commuteWindow.durationMinutes, 180);
    const cEnd = (cStart * 60 + cDur) % MINUTES_IN_DAY;
    const cEndHour = Math.floor(cEnd / 60);
    const morningDur = Math.max(0, (cStart - 6) * 60);
    const eveningDur = Math.max(0, (22 - cEndHour) * 60);

    const windows: ActivityWindow[] = [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
    ];
    if (morningDur > 0) {
      windows.push({ activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: morningDur, room: "living", mask: false });
    }
    windows.push({ ...commuteWindow, durationMinutes: cDur });
    if (eveningDur > 0) {
      windows.push({ activity: "light_indoor", setting: "indoor", startHour: cEndHour, durationMinutes: eveningDur, room: "living", mask: false });
    }
    if (windows.reduce((sum, w) => sum + w.durationMinutes, 0) === MINUTES_IN_DAY && isScheduleValid(windows)) {
      return windows;
    }
  }

  return [
    { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
    { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
  ];
}

/**
 * Fills any uncovered minutes in a member's valid non-overlapping schedule with
 * deterministic indoor rest windows in the living room.
 */
export function fillScheduleGaps(windows: readonly ActivityWindow[]): { windows: ActivityWindow[]; filledMinutes: number } {
  if (!windows || windows.length === 0) {
    return { windows: getDefaultScheduleForAgeBand("adult"), filledMinutes: MINUTES_IN_DAY };
  }

  const minuteOwners = new Int16Array(MINUTES_IN_DAY).fill(-1);
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (!w || w.durationMinutes <= 0) continue;
    const start = ((w.startHour * 60) % MINUTES_IN_DAY + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const dur = Math.min(w.durationMinutes, MINUTES_IN_DAY);
    for (let m = 0; m < dur; m++) minuteOwners[(start + m) % MINUTES_IN_DAY] = i;
  }

  let uncoveredCount = 0;
  for (let m = 0; m < MINUTES_IN_DAY; m++) {
    if (minuteOwners[m] === -1) uncoveredCount++;
  }
  if (uncoveredCount === 0) return { windows: [...windows], filledMinutes: 0 };

  let startScan = 0;
  while (startScan < MINUTES_IN_DAY && minuteOwners[startScan] === -1) startScan++;

  const result: ActivityWindow[] = windows.map((w) => ({ ...w }));
  const gapWindows: ActivityWindow[] = [];
  let step = 0;
  while (step < MINUTES_IN_DAY) {
    const actual = (startScan + step) % MINUTES_IN_DAY;
    if (minuteOwners[actual] === -1) {
      let gapLen = 0;
      while (gapLen < MINUTES_IN_DAY && minuteOwners[(actual + gapLen) % MINUTES_IN_DAY] === -1) gapLen++;
      // Blocks can only start on the hour, so a gap starting mid-hour (e.g. 8:30) extends
      // the block before it instead of adding a block that would collide with it.
      const before = minuteOwners[(actual - 1 + MINUTES_IN_DAY) % MINUTES_IN_DAY] ?? -1;
      const prev = before >= 0 ? result[before] : undefined;
      if (actual % 60 !== 0 && prev) {
        prev.durationMinutes += gapLen;
        step += gapLen;
        continue;
      }
      gapWindows.push({
        activity: "rest_indoor",
        setting: "indoor",
        startHour: Math.floor(actual / 60) % 24,
        durationMinutes: gapLen,
        room: "living",
        mask: false,
      });
      step += gapLen;
    } else {
      step++;
    }
  }

  return { windows: [...result, ...gapWindows], filledMinutes: uncoveredCount };
}
