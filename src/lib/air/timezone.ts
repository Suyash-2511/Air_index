/** Mapping of ISO 3166-1 alpha-2 region codes to representative IANA time zones. */
const REGION_TIMEZONES: Readonly<Record<string, string>> = {
  in: "Asia/Kolkata",
  us: "America/New_York",
  gb: "Europe/London",
  fr: "Europe/Paris",
  de: "Europe/Berlin",
  jp: "Asia/Tokyo",
};

/** Result of mapping a timestamp to its local clock hour. */
interface LocalHourResolution {
  hour: number;
  timeZone: string;
  isFallback: boolean;
}

/** Resolves local clock hour using response regionCode mapped to an IANA time zone. */
export function getLocalHour(isoTimestamp: string | undefined, regionCode?: string): LocalHourResolution {
  if (!isoTimestamp) return { hour: 0, timeZone: "UTC", isFallback: true };
  const match = /T(\d{2}):\d{2}:\d{2}(?:[+-]\d{2}:\d{2})$/.exec(isoTimestamp);
  if (match && match[1]) return { hour: parseInt(match[1], 10), timeZone: "EmbeddedOffset", isFallback: false };

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return { hour: 0, timeZone: "UTC", isFallback: true };

  const cleanRegion = regionCode?.trim().toLowerCase();
  const timeZone = cleanRegion ? REGION_TIMEZONES[cleanRegion] : undefined;
  if (timeZone) {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false });
    return { hour: parseInt(fmt.format(date), 10) % 24, timeZone, isFallback: false };
  }
  return { hour: date.getUTCHours(), timeZone: "UTC", isFallback: true };
}

/** Resolves the current local clock hour for a region code (defaults to "in" / Asia/Kolkata). */
export function getLocationCurrentHour(regionCode = "in", date: Date = new Date()): number {
  const cleanRegion = regionCode.trim().toLowerCase();
  const timeZone = REGION_TIMEZONES[cleanRegion] ?? "Asia/Kolkata";
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false });
  return parseInt(fmt.format(date), 10) % 24;
}
