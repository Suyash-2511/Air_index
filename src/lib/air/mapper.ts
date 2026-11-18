import { z } from "zod";
import type { HourlyAir } from "../types";

/**
 * Molecular weight to molar volume (at 25°C, 1 atm) conversion factors from ppb to µg/m³.
 * (ppb * MW) / 24.45 = µg/m³.
 */
export const PPB_TO_UGM3_FACTORS = {
  no2: 46.01 / 24.45,
  o3: 48.0 / 24.45,
  co: 28.01 / 24.45,
  so2: 64.07 / 24.45,
} as const;

/** Schema validating the concentration object inside each pollutant report. */
export const concentrationSchema = z.object({
  value: z.number(),
  units: z.string(),
});

/** Schema validating individual pollutant entries from Google Air Quality API. */
export const pollutantSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  fullName: z.string().optional(),
  concentration: concentrationSchema.optional(),
});

/** Schema validating the current conditions lookup response. */
export const currentConditionsResponseSchema = z.object({
  dateTime: z.string().optional(),
  pollutants: z.array(pollutantSchema).optional(),
});

/** Schema validating an hourly record in the forecast lookup response. */
export const hourlyForecastRecordSchema = z.object({
  dateTime: z.string().optional(),
  pollutants: z.array(pollutantSchema).optional(),
});

/** Schema validating the forecast lookup response body. */
export const forecastResponseSchema = z.object({
  hourlyForecasts: z.array(hourlyForecastRecordSchema).optional(),
});

/**
 * Converts a pollutant concentration value into µg/m³ based on reported units.
 * Handles PARTS_PER_BILLION via gas molecular weight at 25°C and 1 atmosphere.
 */
export function convertConcentration(code: string, value: number, units: string): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const normalizedUnits = units.toUpperCase();
  if (normalizedUnits === "MICROGRAMS_PER_CUBIC_METER") {
    return Math.round(value * 100) / 100;
  }
  if (normalizedUnits === "PARTS_PER_BILLION") {
    const key = code.toLowerCase();
    const factor: number | undefined =
      key in PPB_TO_UGM3_FACTORS ? PPB_TO_UGM3_FACTORS[key as keyof typeof PPB_TO_UGM3_FACTORS] : undefined;
    const converted = factor !== undefined ? value * factor : value;
    return Math.round(converted * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Maps an RFC3339 timestamp to the local clock hour (0–23) of the given coordinates.
 * Defaults to Asia/Kolkata for Indian subcontinent coordinates.
 */
export function getLocalHour(isoTimestamp: string | undefined, lat: number, lng: number): number {
  if (!isoTimestamp) return 0;
  const match = /T(\d{2}):\d{2}:\d{2}(?:[+-]\d{2}:\d{2})$/.exec(isoTimestamp);
  if (match && match[1]) return parseInt(match[1], 10);

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return 0;

  if (lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98) {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false });
    return parseInt(fmt.format(date), 10) % 24;
  }

  const offsetMinutes = Math.round((lng / 15) * 60);
  const localTime = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return localTime.getUTCHours();
}

interface ExtractedPollutants {
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
}

function extractPollutants(pollutants: ReadonlyArray<z.infer<typeof pollutantSchema>> = []): ExtractedPollutants {
  const result: ExtractedPollutants = { pm25: 0 };
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

/**
 * Maps raw currentConditions:lookup JSON into a validated HourlyAir reading.
 * Throws ZodError on malformed response structure.
 */
export function mapCurrentConditions(raw: unknown, lat: number, lng: number): HourlyAir {
  const parsed = currentConditionsResponseSchema.parse(raw);
  const hour = getLocalHour(parsed.dateTime, lat, lng);
  const { pm25, pm10, no2, o3 } = extractPollutants(parsed.pollutants);
  return { hour, pm25, ...(pm10 !== undefined && { pm10 }), ...(no2 !== undefined && { no2 }), ...(o3 !== undefined && { o3 }) };
}

/**
 * Maps raw forecast:lookup JSON into an array of HourlyAir readings.
 * Ensures timestamps are converted to local hours and limits to requested length.
 */
export function mapForecast(raw: unknown, lat: number, lng: number, maxHours?: number): HourlyAir[] {
  const parsed = forecastResponseSchema.parse(raw);
  const items = parsed.hourlyForecasts ?? [];
  const mapped = items.map((item) => {
    const hour = getLocalHour(item.dateTime, lat, lng);
    const { pm25, pm10, no2, o3 } = extractPollutants(item.pollutants);
    return { hour, pm25, ...(pm10 !== undefined && { pm10 }), ...(no2 !== undefined && { no2 }), ...(o3 !== undefined && { o3 }) };
  });
  return typeof maxHours === "number" && maxHours > 0 ? mapped.slice(0, maxHours) : mapped;
}
