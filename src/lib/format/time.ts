import { HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR } from "../time-units";

const NOON_HOUR = 12;

/** Wraps any hour, including negative ones, into 0 to 23. */
const wrapHour = (hour: number): number => ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

/** The 12-hour dial number and AM/PM for an hour of the day; midnight and noon read as 12. */
function toDial(hour: number): { dial: number; period: "AM" | "PM" } {
  const wrapped = wrapHour(hour);
  return { dial: wrapped % NOON_HOUR === 0 ? NOON_HOUR : wrapped % NOON_HOUR, period: wrapped < NOON_HOUR ? "AM" : "PM" };
}

/** Formats a 24-hour integer hour as a standard 12-hour clock label (e.g. "6 AM", "12 PM", "11 PM"). */
export function formatClock(hour: number): string {
  const { dial, period } = toDial(hour);
  return `${dial} ${period}`;
}

/** Formats minutes after midnight as a clock string (e.g. "6 AM", "6:30 AM"), handling midnight wraps. */
export function formatTimeOfDay(minutes: number): string {
  const total = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const minuteOfHour = total % MINUTES_PER_HOUR;
  const clock = formatClock(Math.floor(total / MINUTES_PER_HOUR));
  return minuteOfHour === 0 ? clock : clock.replace(" ", `:${minuteOfHour.toString().padStart(2, "0")} `);
}

/** Formats an hour span cleanly, sharing the period when identical (e.g. "2–4 PM", "11 AM – 1 PM"). */
export function formatHourRange(startHour: number, endHour: number): string {
  const start = toDial(startHour);
  const end = toDial(endHour);
  if (start.period === end.period) return `${start.dial}–${end.dial} ${start.period}`;
  return `${start.dial} ${start.period} – ${end.dial} ${end.period}`;
}

/** Formats duration in minutes into conversational English (e.g. "30 min", "1 hr", "1 hr 30 min"). */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainder = minutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}
