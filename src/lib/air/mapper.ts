import { z } from "zod";
import { AppError } from "../security/errors";
import type { HourlyAir } from "../types";

/** Molecular weight to molar volume conversion factors from ppb to µg/m³ ((ppb * MW) / 24.45). */
export const PPB_TO_UGM3_FACTORS = {
  no2: 46.01 / 24.45,
  o3: 48.0 / 24.45,
  co: 28.01 / 24.45,
  so2: 64.07 / 24.45,
} as const;

/** Mapping of ISO 3166-1 alpha-2 region codes to representative IANA time zones. */
export const REGION_TIMEZONES: Readonly<Record<string, string>> = {
  in: "Asia/Kolkata",
  us: "America/New_York",
  gb: "Europe/London",
  fr: "Europe/Paris",
  de: "Europe/Berlin",
  jp: "Asia/Tokyo",
};

export const concentrationSchema = z.object({ value: z.number(), units: z.string() });
export const pollutantSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  fullName: z.string().optional(),
  concentration: concentrationSchema.optional(),
});
export const currentConditionsResponseSchema = z.object({
  dateTime: z.string().optional(),
  regionCode: z.string().optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
export const hourlyForecastRecordSchema = z.object({
  dateTime: z.string().optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
export const forecastResponseSchema = z.object({
  regionCode: z.string().optional(),
  hourlyForecasts: z.array(hourlyForecastRecordSchema).optional(),
});

/** Converts a pollutant concentration value into µg/m³ based on reported units. */
export function convertConcentration(code: string, value: number, units: string): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const normalizedUnits = units.toUpperCase();
  if (normalizedUnits === "MICROGRAMS_PER_CUBIC_METER") return Math.round(value * 100) / 100;
  if (normalizedUnits === "PARTS_PER_BILLION") {
    const key = code.toLowerCase();
    const factor: number | undefined =
      key in PPB_TO_UGM3_FACTORS ? PPB_TO_UGM3_FACTORS[key as keyof typeof PPB_TO_UGM3_FACTORS] : undefined;
    const converted = factor !== undefined ? value * factor : value;
    return Math.round(converted * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

/** Result of mapping a timestamp to its local clock hour. */
export interface LocalHourResolution {
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

interface ExtractedPollutants {
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
}

function extractPollutants(pollutants: ReadonlyArray<z.infer<typeof pollutantSchema>> = []): ExtractedPollutants {
  const result: ExtractedPollutants = {};
  for (const p of pollutants) {
    if (!p.concentration || !Number.isFinite(p.concentration.value)) continue;
    const code = p.code.toLowerCase();
    const val = convertConcentration(code, p.concentration.value, p.concentration.units);
    if (code === "pm25") result.pm25 = Math.min(2000, Math.max(0, val));
    else if (code === "pm10") result.pm10 = Math.min(2000, Math.max(0, val));
    else if (code === "no2") result.no2 = Math.min(2000, Math.max(0, val));
    else if (code === "o3") result.o3 = Math.min(2000, Math.max(0, val));
  }
  return result;
}

/** Maps raw currentConditions:lookup JSON into a validated HourlyAir reading. */
export function mapCurrentConditions(raw: unknown): HourlyAir {
  const parsed = currentConditionsResponseSchema.parse(raw);
  const { hour, isFallback } = getLocalHour(parsed.dateTime, parsed.regionCode);
  const { pm25, pm10, no2, o3 } = extractPollutants(parsed.pollutants);

  if (pm25 === undefined) {
    throw new AppError(502, "Current conditions response missing PM2.5 reading.");
  }

  return {
    hour,
    pm25,
    ...(pm10 !== undefined && { pm10 }),
    ...(no2 !== undefined && { no2 }),
    ...(o3 !== undefined && { o3 }),
    ...(isFallback && { timeZoneFallback: true }),
  };
}

/** Maps raw forecast:lookup JSON into an array of HourlyAir readings. */
export function mapForecast(raw: unknown, maxHours?: number): HourlyAir[] {
  const parsed = forecastResponseSchema.parse(raw);
  const items = parsed.hourlyForecasts ?? [];
  const mapped: HourlyAir[] = [];

  for (const item of items) {
    const { hour, isFallback } = getLocalHour(item.dateTime, parsed.regionCode);
    const { pm25, pm10, no2, o3 } = extractPollutants(item.pollutants);
    if (pm25 === undefined) continue;

    mapped.push({
      hour,
      pm25,
      ...(pm10 !== undefined && { pm10 }),
      ...(no2 !== undefined && { no2 }),
      ...(o3 !== undefined && { o3 }),
      ...(isFallback && { timeZoneFallback: true }),
    });
  }

  return typeof maxHours === "number" && maxHours > 0 ? mapped.slice(0, maxHours) : mapped;
}

/** Constructs a 24-hour sequence anchored by current conditions. */
export function buildTodayForecast(current: HourlyAir, forecast: ReadonlyArray<HourlyAir>): HourlyAir[] {
  const result: HourlyAir[] = [current];
  const currentHour = current.hour;

  for (const item of forecast) {
    if (result.length >= 24) break;
    if (item.hour === currentHour) continue;
    result.push(item);
  }

  return result;
}
