import { z } from "zod";
import { googleJson } from "../google/http";
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

/**
 * Fetches daily pollen forecast from Google Pollen API via the shared HTTP helper.
 * Uses X-Goog-Api-Key header authentication, 10s timeout, and 429/5xx retry backoff.
 */
export async function getPollenForecast(location: Location, apiKey: string): Promise<PollenLevel> {
  const url = `${GOOGLE_POLLEN_BASE_URL}/forecast:lookup?location.latitude=${location.lat}&location.longitude=${location.lng}&days=1`;
  const raw = await googleJson(url, apiKey);
  const parsed = pollenForecastResponseSchema.parse(raw);
  return extractMaxPollenLevel(parsed);
}
