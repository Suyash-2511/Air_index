import type { RoutineItem } from "./build-routine";

function formatCalendarDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}`;
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
