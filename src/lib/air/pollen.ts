import { z } from "zod";
import { AppError } from "../security/errors";
import type { Location } from "../types";

/** Categorized pollen allergen risk level for households with sensitive members. */
export type PollenLevel = "low" | "medium" | "high";

/** Base URL for Google Maps Platform Pollen API v1. */
export const GOOGLE_POLLEN_BASE_URL = "https://pollen.googleapis.com/v1";

/** Schema for index details within a pollen type item. */
export const pollenIndexInfoSchema = z.object({
  code: z.string().optional(),
  displayName: z.string().optional(),
  value: z.number().optional(),
  category: z.string().optional(),
});

/** Schema for individual pollen type info records. */
export const pollenTypeInfoSchema = z.object({
  code: z.string().optional(),
  displayName: z.string().optional(),
  indexInfo: pollenIndexInfoSchema.optional(),
});

/** Schema for daily pollen forecast records. */
export const dailyPollenInfoSchema = z.object({
  pollenTypeInfo: z.array(pollenTypeInfoSchema).optional(),
});

/** Schema validating the full Pollen forecast API response. */
export const pollenForecastResponseSchema = z.object({
  regionCode: z.string().optional(),
  dailyInfo: z.array(dailyPollenInfoSchema).optional(),
});

/**
 * Maps numeric Universal Pollen Index (UPI, 0-5) to a simplified three-tier risk level.
 * Values 0-2 = low, 3 = medium, 4-5 = high.
 */
export function mapUpiToPollenLevel(upiValue: number | undefined): PollenLevel {
  if (upiValue === undefined || !Number.isFinite(upiValue) || upiValue <= 2) {
    return "low";
  }
  if (upiValue === 3) {
    return "medium";
  }
  return "high";
}

/**
 * Extracts the maximum Universal Pollen Index from parsed daily info.
 */
export function extractMaxPollenLevel(data: z.infer<typeof pollenForecastResponseSchema>): PollenLevel {
  const daily = data.dailyInfo?.[0];
  if (!daily || !daily.pollenTypeInfo || daily.pollenTypeInfo.length === 0) {
    return "low";
  }

  let maxUpi = 0;
  for (const info of daily.pollenTypeInfo) {
    const val = info.indexInfo?.value;
    if (typeof val === "number" && val > maxUpi) {
      maxUpi = val;
    }
  }

  return mapUpiToPollenLevel(maxUpi);
}

interface PollenRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

/**
 * Fetches daily pollen forecast from Google Pollen API and maps it to low/medium/high.
 * Uses 10s timeout and up to 2 retries with backoff on 429 and 5xx errors.
 */
export async function getPollenForecast(
  location: Location,
  apiKey: string,
  options: PollenRequestOptions = {},
): Promise<PollenLevel> {
  if (!apiKey) {
    throw new AppError(500, "Google Pollen API key is not configured.");
  }

  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.maxRetries ?? 2;
  let backoffMs = options.initialBackoffMs ?? 500;
  let attempt = 0;

  const url = `${GOOGLE_POLLEN_BASE_URL}/forecast:lookup?key=${encodeURIComponent(
    apiKey,
  )}&location.latitude=${location.lat}&location.longitude=${location.lng}&days=1`;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const raw = await response.json();
        const parsed = pollenForecastResponseSchema.parse(raw);
        return extractMaxPollenLevel(parsed);
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
        `Pollen service returned status ${status}.`,
      );
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError(504, "Pollen service request timed out.");
      }

      if (attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      throw new AppError(502, "Unable to reach pollen service.");
    }
  }

  throw new AppError(502, "Pollen service retries exhausted.");
}
