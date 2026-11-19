import { z } from "zod";
import { AppError, HTTP_STATUS } from "../security";
import type { HourlyAir } from "../types";
import { AQI_SCALE_MAX, FORECAST_HOURS, MOLAR_VOLUME_25C, MOLECULAR_WEIGHTS, POLLUTANT_CEILINGS } from "./constants";
import { calculateIndiaAqi, getAqiCategory } from "./india-aqi";
import { getLocalHour, getLocationCurrentHour } from "./timezone";
import { convertPollutantConcentration } from "./units";

export { getLocalHour, getLocationCurrentHour };

/** Micrograms per cubic metre per part-per-billion, per gas; kept so tests can check conversions independently. */
export const PPB_TO_UGM3_FACTORS = {
  no2: MOLECULAR_WEIGHTS.no2 / MOLAR_VOLUME_25C,
  o3: MOLECULAR_WEIGHTS.o3 / MOLAR_VOLUME_25C,
  co: MOLECULAR_WEIGHTS.co / MOLAR_VOLUME_25C,
  so2: MOLECULAR_WEIGHTS.so2 / MOLAR_VOLUME_25C,
} as const;

const concentrationSchema = z.object({ value: z.number(), units: z.string() });
const pollutantSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  fullName: z.string().optional(),
  concentration: concentrationSchema.optional(),
});
const aqiIndexSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  aqi: z.number().optional(),
  aqiDisplay: z.string().optional(),
  category: z.string().optional(),
  dominantPollutant: z.string().optional(),
});
const currentConditionsResponseSchema = z.object({
  dateTime: z.string().optional(),
  regionCode: z.string().optional(),
  indexes: z.array(aqiIndexSchema).optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
const hourlyForecastRecordSchema = z.object({
  dateTime: z.string().optional(),
  indexes: z.array(aqiIndexSchema).optional(),
  pollutants: z.array(pollutantSchema).optional(),
});
const forecastResponseSchema = z.object({
  regionCode: z.string().optional(),
  hourlyForecasts: z.array(hourlyForecastRecordSchema).optional(),
});

/** Converts pollutant gas concentration from raw API units to Indian reporting standards. */
export function convertConcentration(code: string, value: number, units: string): number {
  return convertPollutantConcentration(code, value, units);
}

type PollutantCode = keyof typeof POLLUTANT_CEILINGS;
type ExtractedPollutants = Partial<Record<PollutantCode, number>>;
type ForecastRecord = z.infer<typeof hourlyForecastRecordSchema>;
type OptionalPollutant = "pm10" | "no2" | "o3" | "co" | "so2";

/** Pollutants reported when present; PM2.5 is separate because a reading without it is unusable. */
const OPTIONAL_POLLUTANTS: readonly OptionalPollutant[] = ["pm10", "no2", "o3", "co", "so2"];

const isPollutantCode = (code: string): code is PollutantCode => Object.hasOwn(POLLUTANT_CEILINGS, code);

/** Normalises each known pollutant to Indian units and clamps it to a plausible range. */
function extractPollutants(pollutants: ReadonlyArray<z.infer<typeof pollutantSchema>> = []): ExtractedPollutants {
  const result: ExtractedPollutants = {};
  for (const pollutant of pollutants) {
    const reading = pollutant.concentration;
    if (!reading || !Number.isFinite(reading.value)) continue;
    const code = pollutant.code.toLowerCase().replace(".", "");
    if (!isPollutantCode(code)) continue;
    const converted = convertPollutantConcentration(code, reading.value, reading.units);
    result[code] = Math.min(POLLUTANT_CEILINGS[code], Math.max(0, converted));
  }
  return result;
}

/** Prefers the official CPCB index from the provider, else computes one from concentrations. */
function resolveAqi(
  indexes: ReadonlyArray<z.infer<typeof aqiIndexSchema>> | undefined,
  concentrations: ExtractedPollutants,
): HourlyAir["aqi"] {
  const cpcb = indexes?.find((index) => index.code.toLowerCase() === "ind_cpcb");
  if (cpcb && typeof cpcb.aqi === "number" && Number.isFinite(cpcb.aqi)) {
    const value = Math.min(AQI_SCALE_MAX, Math.max(0, Math.round(cpcb.aqi)));
    return {
      value,
      category: cpcb.category ?? getAqiCategory(value),
      dominantPollutant: (cpcb.dominantPollutant ?? "pm25").toLowerCase().replace(".", ""),
      source: "cpcb",
    };
  }
  const { pm25 } = concentrations;
  return pm25 === undefined ? undefined : calculateIndiaAqi({ ...concentrations, pm25 });
}

/** Copies only the optional pollutants that were actually reported, so absent ones stay absent. */
function reportedOptionals(extracted: ExtractedPollutants): Partial<Pick<HourlyAir, OptionalPollutant>> {
  const reported: Partial<Pick<HourlyAir, OptionalPollutant>> = {};
  for (const code of OPTIONAL_POLLUTANTS) {
    const value = extracted[code];
    if (value !== undefined) reported[code] = value;
  }
  return reported;
}

/** Turns one provider record into an hourly reading, or undefined when it has no PM2.5. */
function toReading(record: ForecastRecord, regionCode: string | undefined): HourlyAir | undefined {
  const { hour, isFallback } = getLocalHour(record.dateTime, regionCode);
  const extracted = extractPollutants(record.pollutants);
  if (extracted.pm25 === undefined) return undefined;

  const aqi = resolveAqi(record.indexes, extracted);
  return {
    hour,
    pm25: extracted.pm25,
    ...reportedOptionals(extracted),
    ...(aqi && { aqi }),
    ...(isFallback && { timeZoneFallback: true }),
  };
}

/** Maps raw Google Air Quality current conditions response to internal HourlyAir model. */
export function mapCurrentConditions(raw: unknown): HourlyAir {
  const parsed = currentConditionsResponseSchema.parse(raw);
  const reading = toReading(parsed, parsed.regionCode);
  if (!reading) throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Current conditions response missing PM2.5 reading.");
  return reading;
}

/** Maps raw Google Air Quality forecast records to a list of hourly air readings. */
export function mapForecast(raw: unknown, maxHours?: number): HourlyAir[] {
  const parsed = forecastResponseSchema.parse(raw);
  const readings = (parsed.hourlyForecasts ?? []).flatMap((record) => toReading(record, parsed.regionCode) ?? []);
  return typeof maxHours === "number" && maxHours > 0 ? readings.slice(0, maxHours) : readings;
}

/** Merges current air conditions with upcoming forecast records into a 24-hour day forecast. */
export function buildTodayForecast(current: HourlyAir, forecast: ReadonlyArray<HourlyAir>): HourlyAir[] {
  const upcoming = forecast.filter((reading) => reading.hour !== current.hour);
  return [current, ...upcoming].slice(0, FORECAST_HOURS);
}
