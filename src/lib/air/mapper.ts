import { z } from "zod";
import { AppError } from "../security/errors";
import type { HourlyAir } from "../types";
import { calculateIndiaAqi, type ConcentrationInput, getAqiCategory } from "./india-aqi";
import { convertPollutantConcentration, MOLECULAR_WEIGHTS } from "./units";

export const PPB_TO_UGM3_FACTORS = {
  no2: MOLECULAR_WEIGHTS.no2 / 24.45,
  o3: MOLECULAR_WEIGHTS.o3 / 24.45,
  co: MOLECULAR_WEIGHTS.co / 24.45,
  so2: MOLECULAR_WEIGHTS.so2 / 24.45,
} as const;

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
export const aqiIndexSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  aqi: z.number().optional(),
  aqiDisplay: z.string().optional(),
  category: z.string().optional(),
  dominantPollutant: z.string().optional(),
});
export const currentConditionsResponseSchema = z.object({
  dateTime: z.string().optional(),
  regionCode: z.string().optional(),
  indexes: z.array(aqiIndexSchema).optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
export const hourlyForecastRecordSchema = z.object({
  dateTime: z.string().optional(),
  indexes: z.array(aqiIndexSchema).optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
export const forecastResponseSchema = z.object({
  regionCode: z.string().optional(),
  hourlyForecasts: z.array(hourlyForecastRecordSchema).optional(),
});

export function convertConcentration(code: string, value: number, units: string): number {
  return convertPollutantConcentration(code, value, units);
}

export interface LocalHourResolution {
  hour: number;
  timeZone: string;
  isFallback: boolean;
}

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
  co?: number;
  so2?: number;
}

function extractPollutants(pollutants: ReadonlyArray<z.infer<typeof pollutantSchema>> = []): ExtractedPollutants {
  const result: ExtractedPollutants = {};
  for (const p of pollutants) {
    if (!p.concentration || !Number.isFinite(p.concentration.value)) continue;
    const code = p.code.toLowerCase().replace(".", "");
    const val = convertPollutantConcentration(code, p.concentration.value, p.concentration.units);
    if (code === "pm25") result.pm25 = Math.min(2000, Math.max(0, val));
    else if (code === "pm10") result.pm10 = Math.min(2000, Math.max(0, val));
    else if (code === "no2") result.no2 = Math.min(2000, Math.max(0, val));
    else if (code === "o3") result.o3 = Math.min(2000, Math.max(0, val));
    else if (code === "co") result.co = Math.min(200, Math.max(0, val));
    else if (code === "so2") result.so2 = Math.min(2000, Math.max(0, val));
  }
  return result;
}

function resolveAqi(
  indexes: ReadonlyArray<z.infer<typeof aqiIndexSchema>> | undefined,
  concentrations: ExtractedPollutants,
): HourlyAir["aqi"] {
  const cpcb = indexes?.find((idx) => idx.code.toLowerCase() === "ind_cpcb");
  if (cpcb && typeof cpcb.aqi === "number" && Number.isFinite(cpcb.aqi)) {
    const val = Math.min(500, Math.max(0, Math.round(cpcb.aqi)));
    return {
      value: val,
      // Google words CPCB categories differently ("Poor air quality"); use the CPCB band names.
      category: getAqiCategory(val),
      dominantPollutant: (cpcb.dominantPollutant ?? "pm25").toLowerCase().replace(".", ""),
      source: "cpcb",
    };
  }
  if (concentrations.pm25 !== undefined) {
    return calculateIndiaAqi(concentrations as ConcentrationInput);
  }
  return undefined;
}

export function mapCurrentConditions(raw: unknown): HourlyAir {
  const parsed = currentConditionsResponseSchema.parse(raw);
  const { hour, isFallback } = getLocalHour(parsed.dateTime, parsed.regionCode);
  const extracted = extractPollutants(parsed.pollutants);

  if (extracted.pm25 === undefined) {
    throw new AppError(502, "Current conditions response missing PM2.5 reading.");
  }

  const aqi = resolveAqi(parsed.indexes, extracted);

  return {
    hour,
    pm25: extracted.pm25,
    ...(extracted.pm10 !== undefined && { pm10: extracted.pm10 }),
    ...(extracted.no2 !== undefined && { no2: extracted.no2 }),
    ...(extracted.o3 !== undefined && { o3: extracted.o3 }),
    ...(extracted.co !== undefined && { co: extracted.co }),
    ...(extracted.so2 !== undefined && { so2: extracted.so2 }),
    ...(aqi && { aqi }),
    ...(isFallback && { timeZoneFallback: true }),
  };
}

export function mapForecast(raw: unknown, maxHours?: number): HourlyAir[] {
  const parsed = forecastResponseSchema.parse(raw);
  const items = parsed.hourlyForecasts ?? [];
  const mapped: HourlyAir[] = [];

  for (const item of items) {
    const { hour, isFallback } = getLocalHour(item.dateTime, parsed.regionCode);
    const extracted = extractPollutants(item.pollutants);
    if (extracted.pm25 === undefined) continue;

    const aqi = resolveAqi(item.indexes, extracted);

    mapped.push({
      hour,
      pm25: extracted.pm25,
      ...(extracted.pm10 !== undefined && { pm10: extracted.pm10 }),
      ...(extracted.no2 !== undefined && { no2: extracted.no2 }),
      ...(extracted.o3 !== undefined && { o3: extracted.o3 }),
      ...(extracted.co !== undefined && { co: extracted.co }),
      ...(extracted.so2 !== undefined && { so2: extracted.so2 }),
      ...(aqi && { aqi }),
      ...(isFallback && { timeZoneFallback: true }),
    });
  }

  return typeof maxHours === "number" && maxHours > 0 ? mapped.slice(0, maxHours) : mapped;
}

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
