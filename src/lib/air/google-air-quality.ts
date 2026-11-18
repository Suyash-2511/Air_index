import { googleJson } from "../google/http";
import type { HourlyAir, Location } from "../types";
import { mapCurrentConditions, mapForecast } from "./mapper";
import type { AirProvider } from "./provider";

/** Extra computation options enabled on all Google Air Quality API requests. */
export const EXTRA_COMPUTATIONS = [
  "POLLUTANT_CONCENTRATION",
  "HEALTH_RECOMMENDATIONS",
  "LOCAL_AQI",
] as const;

/** Base URL for Google Maps Platform Air Quality API v1. */
export const GOOGLE_AIR_BASE_URL = "https://airquality.googleapis.com/v1";

/**
 * AirProvider implementation communicating with Google Maps Platform Air Quality API.
 * Delegates requests through the shared Google HTTP helper using X-Goog-Api-Key headers.
 */
export class GoogleAirQualityProvider implements AirProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Fetches current conditions for the specified location. */
  async current(location: Location): Promise<HourlyAir> {
    const url = `${GOOGLE_AIR_BASE_URL}/currentConditions:lookup`;
    const payload = {
      location: { latitude: location.lat, longitude: location.lng },
      extraComputations: EXTRA_COMPUTATIONS,
      universalAqi: true,
      languageCode: "en",
    };

    const raw = await googleJson(url, this.apiKey, { body: payload });
    return mapCurrentConditions(raw);
  }

  /** Fetches hourly forecast records for the specified location and duration. */
  async forecast(location: Location, hours: number): Promise<HourlyAir[]> {
    const count = Math.max(1, Math.min(hours, 96));
    const now = new Date();
    const startTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
    const endTime = new Date(startTime.getTime() + (count - 1) * 3600000);

    const url = `${GOOGLE_AIR_BASE_URL}/forecast:lookup`;
    const payload = {
      location: { latitude: location.lat, longitude: location.lng },
      extraComputations: EXTRA_COMPUTATIONS,
      period: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      pageSize: count,
      universalAqi: true,
      languageCode: "en",
    };

    const raw = await googleJson(url, this.apiKey, { body: payload });
    return mapForecast(raw, hours);
  }
}
