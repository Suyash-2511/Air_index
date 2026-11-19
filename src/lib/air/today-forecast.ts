import type { DayForecast, HourlyAir, Location } from "../types";
import { FORECAST_HOURS } from "./constants";
import { buildTodayForecast } from "./mapper";
import type { AirProvider } from "./provider";

/** Current conditions, the merged 24-hour day, and the same day keyed by hour for the dose engine. */
export interface TodayForecast {
  current: HourlyAir;
  forecast: HourlyAir[];
  byHour: DayForecast;
}

/**
 * Loads today's air for a location so every route builds its day the same way. The provider is passed
 * in, not looked up here, so callers (and tests) decide whether live or fixture data is used.
 */
export async function loadTodayForecast(provider: AirProvider, location: Location): Promise<TodayForecast> {
  const current = await provider.current(location);
  const upcoming = await provider.forecast(location, FORECAST_HOURS);
  const forecast = buildTodayForecast(current, upcoming);
  return { current, forecast, byHour: new Map(forecast.map((entry) => [entry.hour, entry.pm25])) };
}
