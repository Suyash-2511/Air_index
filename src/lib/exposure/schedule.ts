import { formatClock } from "../format";
import { AWAKE_MINUTES, BEDTIME_HOUR, WAKE_HOUR, buildOvernightSleep } from "../household-defaults";
import { t, type Locale } from "../i18n";
import { getActivityLabel } from "../labels";
import { HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR } from "../time-units";
import type { ActivityWindow, AgeBand } from "../types";

/** Plain wording for a block, e.g. "Cycling at 8 AM", used in schedule messages people read. */
function describe(block: ActivityWindow, locale: Locale = "en"): string {
  const clock = formatClock(block.startHour);
  if (locale === "hi") {
    const actLabel = getActivityLabel(block.activity, "hi");
    return t("hi", "sched_at_clock", { name: actLabel, clock });
  }
  const name = block.activity.replace(/_/g, " ");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} at ${clock}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Marker for a minute of the day that no block covers. */
const NO_OWNER = -1;

/** Minute of the day a block starts, wrapped so hours past midnight or below zero stay in 0..1439. */
function startMinute(block: ActivityWindow): number {
  return (((block.startHour * MINUTES_PER_HOUR) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Minutes of the day a block covers, capped at one day so a bad duration cannot loop forever. */
function coveredMinutes(block: ActivityWindow): number {
  return Math.min(block.durationMinutes, MINUTES_PER_DAY);
}

/** Flags blocks with no length or a length over one day. */
function checkBlockLengths(blocks: readonly ActivityWindow[], locale: Locale): string[] {
  const problems: string[] = [];
  for (const block of blocks) {
    if (block.durationMinutes <= 0) {
      problems.push(t(locale, "sched_needs_length", { desc: describe(block, locale) }));
    } else if (block.durationMinutes > MINUTES_PER_DAY) {
      problems.push(t(locale, "sched_too_long", { desc: describe(block, locale) }));
    }
  }
  return problems;
}

/** Flags a day whose blocks add up to more than 24 hours, saying by how much. */
function checkDayLength(blocks: readonly ActivityWindow[], locale: Locale): string[] {
  const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  if (totalMinutes <= MINUTES_PER_DAY) return [];
  const extraHours = (totalMinutes - MINUTES_PER_DAY) / MINUTES_PER_HOUR;
  return [t(locale, "sched_day_over_24", { total: +(totalMinutes / MINUTES_PER_HOUR).toFixed(1), extra: +extraHours.toFixed(1) })];
}

/**
 * Claims each minute a block covers, stopping at the first minute another block already owns.
 * Returns that other block's index, or undefined when the block fits.
 */
function claimMinutes(owners: Int16Array, block: ActivityWindow, index: number): number | undefined {
  const start = startMinute(block);
  const length = coveredMinutes(block);
  for (let offset = 0; offset < length; offset++) {
    const minute = (start + offset) % MINUTES_PER_DAY;
    const owner = owners[minute];
    if (owner !== undefined && owner !== NO_OWNER && owner !== index) return owner;
    owners[minute] = index;
  }
  return undefined;
}

/** Says which two blocks collide, in the reader's language. */
function describeOverlap(block: ActivityWindow, other: ActivityWindow | undefined, locale: Locale): string {
  return t(locale, "sched_overlap", {
    desc1: describe(block, locale),
    desc2: other ? lowerFirst(describe(other, locale)) : t(locale, "sched_another_block"),
  });
}

/** Finds blocks that share a minute of the day, including blocks that wrap past midnight. */
function findOverlaps(blocks: readonly ActivityWindow[], locale: Locale): string[] {
  const owners = new Int16Array(MINUTES_PER_DAY).fill(NO_OWNER);
  const problems: string[] = [];
  blocks.forEach((block, index) => {
    if (block.durationMinutes <= 0) return;
    const clashWith = claimMinutes(owners, block, index);
    if (clashWith !== undefined) problems.push(describeOverlap(block, blocks[clashWith], locale));
  });
  return problems;
}

/**
 * Validates a household member's activity windows for schedule integrity.
 * Detects overlapping windows (including midnight wraps) and schedules > 1440m.
 */
export function validateSchedule(windows: readonly ActivityWindow[], locale: Locale = "en"): string[] {
  if (!windows || windows.length === 0) return [t(locale, "sched_empty")];
  return [...checkBlockLengths(windows, locale), ...checkDayLength(windows, locale), ...findOverlaps(windows, locale)];
}

/** Returns true if a member's schedule contains no overlaps and does not exceed 1440 minutes. */
export function isScheduleValid(windows: readonly ActivityWindow[]): boolean {
  return validateSchedule(windows).length === 0;
}

/** Children sleep earlier and longer than adults: 8 PM for ten hours. */
const CHILD_BEDTIME_HOUR = 20;
const CHILD_SLEEP_MINUTES = 10 * MINUTES_PER_HOUR;

/** A stated commute is kept to three hours so one long block cannot crowd out the rest of the day. */
const MAX_COMMUTE_MINUTES = 3 * MINUTES_PER_HOUR;

/** An indoor block in the living room. */
function livingRoomBlock(activity: "rest_indoor" | "light_indoor", startHour: number, durationMinutes: number): ActivityWindow {
  return { activity, setting: "indoor", startHour, durationMinutes, room: "living", mask: false };
}

/** An adult day with no commute: asleep overnight, indoors for the rest. */
function homeDay(): ActivityWindow[] {
  return [buildOvernightSleep(), livingRoomBlock("light_indoor", WAKE_HOUR, AWAKE_MINUTES)];
}

/** A child day: early bedtime and a long sleep, resting indoors the rest of the day. */
function childDay(): ActivityWindow[] {
  const sleep: ActivityWindow = { ...buildOvernightSleep(), startHour: CHILD_BEDTIME_HOUR, durationMinutes: CHILD_SLEEP_MINUTES };
  return [sleep, livingRoomBlock("rest_indoor", WAKE_HOUR, MINUTES_PER_DAY - CHILD_SLEEP_MINUTES)];
}

/** A day built around the stated commute, or undefined when the pieces do not add up to a valid 24 hours. */
function dayAroundCommute(commute: ActivityWindow): ActivityWindow[] | undefined {
  const commuteMinutes = Math.min(commute.durationMinutes, MAX_COMMUTE_MINUTES);
  const endMinute = (commute.startHour * MINUTES_PER_HOUR + commuteMinutes) % MINUTES_PER_DAY;
  const endHour = Math.floor(endMinute / MINUTES_PER_HOUR);
  const morningMinutes = Math.max(0, (commute.startHour - WAKE_HOUR) * MINUTES_PER_HOUR);
  const eveningMinutes = Math.max(0, (BEDTIME_HOUR - endHour) * MINUTES_PER_HOUR);

  const blocks: ActivityWindow[] = [buildOvernightSleep()];
  if (morningMinutes > 0) blocks.push(livingRoomBlock("light_indoor", WAKE_HOUR, morningMinutes));
  blocks.push({ ...commute, durationMinutes: commuteMinutes });
  if (eveningMinutes > 0) blocks.push(livingRoomBlock("light_indoor", endHour, eveningMinutes));

  const total = blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  return total === MINUTES_PER_DAY && isScheduleValid(blocks) ? blocks : undefined;
}

/**
 * Generates a standard, guaranteed-valid 24-hour non-overlapping schedule (1440 minutes)
 * for a member based on age band and optional stated commute window.
 */
export function getDefaultScheduleForAgeBand(ageBand: AgeBand, commuteWindow?: ActivityWindow): ActivityWindow[] {
  if (ageBand === "infant" || ageBand === "child") return childDay();
  return (commuteWindow && dayAroundCommute(commuteWindow)) || homeDay();
}

/** Records which block covers each minute of the day; later blocks win, as the schedule is already valid. */
function markMinuteOwners(blocks: readonly ActivityWindow[]): Int16Array {
  const owners = new Int16Array(MINUTES_PER_DAY).fill(NO_OWNER);
  blocks.forEach((block, index) => {
    if (block.durationMinutes <= 0) return;
    const start = startMinute(block);
    const length = coveredMinutes(block);
    for (let offset = 0; offset < length; offset++) owners[(start + offset) % MINUTES_PER_DAY] = index;
  });
  return owners;
}

/** Length of the run of uncovered minutes that starts at the given minute. */
function gapLength(owners: Int16Array, fromMinute: number): number {
  let length = 0;
  while (length < MINUTES_PER_DAY && owners[(fromMinute + length) % MINUTES_PER_DAY] === NO_OWNER) length++;
  return length;
}

/**
 * Blocks can only start on the hour, so a gap starting mid-hour (e.g. 8:30) extends the block before
 * it instead of adding a block that would collide with it. Returns whether it did so.
 */
function extendPreviousBlock(owners: Int16Array, blocks: ActivityWindow[], gapStart: number, length: number): boolean {
  const ownerBefore = owners[(gapStart - 1 + MINUTES_PER_DAY) % MINUTES_PER_DAY] ?? NO_OWNER;
  const previous = ownerBefore >= 0 ? blocks[ownerBefore] : undefined;
  if (gapStart % MINUTES_PER_HOUR === 0 || !previous) return false;
  previous.durationMinutes += length;
  return true;
}

/** A living-room rest block that covers one uncovered stretch. */
function buildRestBlock(gapStart: number, length: number): ActivityWindow {
  return {
    activity: "rest_indoor",
    setting: "indoor",
    startHour: Math.floor(gapStart / MINUTES_PER_HOUR) % HOURS_PER_DAY,
    durationMinutes: length,
    room: "living",
    mask: false,
  };
}

/** Walks the day once, starting at a covered minute so a gap that wraps midnight is seen whole. */
function fillGaps(owners: Int16Array, blocks: ActivityWindow[]): ActivityWindow[] {
  let scanStart = 0;
  while (scanStart < MINUTES_PER_DAY && owners[scanStart] === NO_OWNER) scanStart++;

  const restBlocks: ActivityWindow[] = [];
  let step = 0;
  while (step < MINUTES_PER_DAY) {
    const minute = (scanStart + step) % MINUTES_PER_DAY;
    if (owners[minute] !== NO_OWNER) {
      step++;
      continue;
    }
    const length = gapLength(owners, minute);
    step += length;
    if (!extendPreviousBlock(owners, blocks, minute, length)) restBlocks.push(buildRestBlock(minute, length));
  }
  return restBlocks;
}

/**
 * Fills any uncovered minutes in a member's valid non-overlapping schedule with
 * deterministic indoor rest windows in the living room.
 */
export function fillScheduleGaps(windows: readonly ActivityWindow[]): { windows: ActivityWindow[]; filledMinutes: number } {
  if (!windows || windows.length === 0) {
    return { windows: getDefaultScheduleForAgeBand("adult"), filledMinutes: MINUTES_PER_DAY };
  }

  const owners = markMinuteOwners(windows);
  const uncoveredMinutes = owners.reduce((count, owner) => (owner === NO_OWNER ? count + 1 : count), 0);
  if (uncoveredMinutes === 0) return { windows: [...windows], filledMinutes: 0 };

  const blocks: ActivityWindow[] = windows.map((block) => ({ ...block }));
  const restBlocks = fillGaps(owners, blocks);
  return { windows: [...blocks, ...restBlocks], filledMinutes: uncoveredMinutes };
}
