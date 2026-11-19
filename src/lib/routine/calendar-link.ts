import type { RoutineItem } from "./routine-types";

const twoDigits = (value: number): string => String(value).padStart(2, "0");

/** Google Calendar's compact local timestamp, for example 20260315T083000. */
function formatCalendarDate(date: Date): string {
  const day = `${date.getFullYear()}${twoDigits(date.getMonth() + 1)}${twoDigits(date.getDate())}`;
  const time = `${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`;
  return `${day}T${time}`;
}

/**
 * Builds a Google Calendar event template link for a routine item.
 * Formats start and end times into ISO-like calendar timestamps using the local date.
 */
export function buildGoogleCalendarUrl(item: RoutineItem, baseDate = new Date()): string {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), item.startHour, 0, 0);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), item.endHour, 0, 0);
  const dates = `${formatCalendarDate(start)}/${formatCalendarDate(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates,
    details: item.detail,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
