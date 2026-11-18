import { AppError } from "../security/errors";
import type { HourlyAir, Location } from "../types";
import { mapCurrentConditions, mapForecast } from "./mapper";
import type { AirProvider } from "./provider";

/** Extra computation options enabled on all Google Air Quality API requests. */
export const EXTRA_COMPUTATIONS = ["POLLUTANT_CONCENTRATION", "HEALTH_RECOMMENDATIONS"] as const;

/** Base URL for Google Maps Platform Air Quality API v1. */
export const GOOGLE_AIR_BASE_URL = "https://airquality.googleapis.com/v1";

interface RequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

/**
 * Sends an HTTP POST request to Google Maps Air Quality API with timeout, retry, and backoff.
 * Never logs or echoes the API key in thrown error messages or headers.
 */
export async function postWithRetry(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.maxRetries ?? 2;
  let backoffMs = options.initialBackoffMs ?? 500;
  let attempt = 0;

  const url = `${GOOGLE_AIR_BASE_URL}/${endpoint}?key=${encodeURIComponent(apiKey)}`;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        return await response.json();
      }

      const status = response.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (isRetryable && attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      throw new AppError(
        status >= 500 ? 502 : status,
        `Air quality provider failed with status ${status}.`,
      );
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError(504, "Air quality provider request timed out.");
      }

      if (attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      throw new AppError(502, "Unable to communicate with air quality service.");
    }
  }

  throw new AppError(502, "Air quality service retries exhausted.");
}

/**
 * AirProvider implementation communicating with Google Maps Platform Air Quality API.
 * Translates global satellite and ground station models into local hourly outdoor readings.
 */
export class GoogleAirQualityProvider implements AirProvider {
  private readonly apiKey: string;
  private readonly options: RequestOptions;

  constructor(apiKey: string, options: RequestOptions = {}) {
    if (!apiKey) {
      throw new AppError(500, "Google Air Quality API key is not configured.");
    }
    this.apiKey = apiKey;
    this.options = options;
  }

  /** Fetches current conditions for the specified location. */
  async current(location: Location): Promise<HourlyAir> {
    const payload = {
      location: { latitude: location.lat, longitude: location.lng },
      extraComputations: EXTRA_COMPUTATIONS,
      universalAqi: true,
      languageCode: "en",
    };

    const raw = await postWithRetry("currentConditions:lookup", payload, this.apiKey, this.options);
    return mapCurrentConditions(raw, location.lat, location.lng);
  }

  /** Fetches hourly forecast records for the specified location and duration. */
  async forecast(location: Location, hours: number): Promise<HourlyAir[]> {
    const count = Math.max(1, Math.min(hours, 96));
    const now = new Date();
    const startTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
    const endTime = new Date(startTime.getTime() + (count - 1) * 3600000);

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

    const raw = await postWithRetry("forecast:lookup", payload, this.apiKey, this.options);
    return mapForecast(raw, location.lat, location.lng, hours);
  }
}
