/** Formats a 24-hour integer hour as a standard 12-hour clock label (e.g. "6 AM", "12 PM", "11 PM"). */
export function formatClock(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** Formats minutes after midnight as a clock string (e.g. "6 AM", "6:30 AM"), handling midnight wraps. */
export function formatTimeOfDay(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const clock = formatClock(h);
  return m === 0 ? clock : clock.replace(" ", `:${m.toString().padStart(2, "0")} `);
}

/** Formats an hour span cleanly, sharing the period when identical (e.g. "2–4 PM", "11 AM – 1 PM"). */
export function formatHourRange(startHour: number, endHour: number): string {
  const formatH = (h: number) => {
    const norm = ((h % 24) + 24) % 24;
    const suffix = norm < 12 ? "AM" : "PM";
    const val = norm % 12 === 0 ? 12 : norm % 12;
    return { val, suffix };
  };
  const s = formatH(startHour);
  const e = formatH(endHour);
  if (s.suffix === e.suffix) {
    return `${s.val}–${e.val} ${s.suffix}`;
  }
  return `${s.val} ${s.suffix} – ${e.val} ${e.suffix}`;
}

/** Formats duration in minutes into conversational English (e.g. "30 min", "1 hr", "1 hr 30 min"). */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
