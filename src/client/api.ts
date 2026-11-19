import type { Household, Location } from "@/lib/types";
import {
  airApiResponseSchema,
  askApiResponseSchema,
  errorResponseSchema,
  geocodeApiResponseSchema,
  intakeApiResponseSchema,
  placeLocationApiResponseSchema,
  placesApiResponseSchema,
  planApiResponseSchema,
} from "./schemas";
import type {
  AskApiResponse,
  IntakeApiResponse,
  PlaceSuggestion,
  PlanApiResponse,
} from "./types";

/** A failed call to this app's own API; `message` is safe to show to the visitor. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  // An error page that is not JSON still deserves the fallback message, so a parse failure is not an error here.
  const json: unknown = await res.json().catch(() => ({}));
  const parsed = errorResponseSchema.safeParse(json);
  return new ApiError(res.status, parsed.success && parsed.data.error ? parsed.data.error : fallback);
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Fetches location suggestions for Indian cities and addresses via Places autocomplete. */
export async function fetchPlaceSuggestions(
  query: string,
  sessionToken: string,
): Promise<readonly PlaceSuggestion[]> {
  const res = await postJson("/api/places", { input: query, sessionToken });
  if (!res.ok) throw await readError(res, "Could not load places. Try again.");
  const data = placesApiResponseSchema.parse(await res.json());
  return data.predictions.map((p) => ({
    placeId: p.placeId,
    mainText: p.primaryText,
    secondaryText: p.secondaryText,
  }));
}

/** Resolves a Place ID into geographic coordinates and an official label. */
export async function fetchPlaceLocation(placeId: string, sessionToken: string): Promise<Location> {
  const url = `/api/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url);
  if (!res.ok) throw await readError(res, "Could not open that place. Pick another.");
  const data = placeLocationApiResponseSchema.parse(await res.json());
  return data.place;
}

/** Reverse-geocodes browser coordinates into an Indian location model. */
export async function fetchReverseGeocode(lat: number, lng: number): Promise<Location> {
  const res = await postJson("/api/geocode", { lat, lng });
  if (!res.ok) throw await readError(res, "Could not name your area. Search for it instead.");
  const data = geocodeApiResponseSchema.parse(await res.json());
  return data.location;
}

/** Extracts household structure and activity schedules from freeform user descriptions. */
export async function submitIntake(
  text: string,
  location: Location,
): Promise<IntakeApiResponse> {
  const res = await postJson("/api/intake", { text, location });
  if (!res.ok) {
    throw await readError(res, "Failed to parse household intake");
  }
  return intakeApiResponseSchema.parse(await res.json());
}

/** Computes whole-day physical exposure doses and ranked interventions for a household. */
export async function computePlan(
  household: Household,
  locale: "en" | "hi" = "en",
): Promise<PlanApiResponse> {
  const res = await postJson("/api/plan", { household, locale });
  if (!res.ok) {
    throw await readError(res, "Failed to compute exposure plan");
  }
  return planApiResponseSchema.parse(await res.json());
}

/** Submits a follow-up question grounded strictly in the computed plan and household data. */
export async function askPlanQuestion(
  question: string,
  household: Household,
  locale: "en" | "hi" = "en",
): Promise<AskApiResponse> {
  const res = await postJson("/api/ask", { question, household, locale });
  if (!res.ok) {
    throw await readError(res, "Failed to answer plan question");
  }
  return askApiResponseSchema.parse(await res.json());
}

/** The outdoor reading the landing page shows: PM2.5 and, when the provider has it, the AQI summary. */
export interface CurrentAirReading {
  pm25: number;
  aqi?: {
    value: number;
    category: string;
    dominantPollutant?: string | undefined;
  } | undefined;
}

/** Fetches current air reading including PM2.5 and AQI summary for landing display. */
export async function fetchCurrentAir(lat: number, lng: number): Promise<CurrentAirReading | undefined> {
  try {
    const res = await postJson("/api/air", { lat, lng });
    if (!res.ok) return undefined;
    const parsed = airApiResponseSchema.safeParse(await res.json());
    if (!parsed.success) return undefined;
    const { current } = parsed.data;
    if (!Number.isFinite(current.pm25)) return undefined;
    return {
      pm25: current.pm25,
      ...(current.aqi && { aqi: current.aqi }),
    };
  } catch {
    // The landing reading is decoration: offline or a failed call just means no number is shown.
    return undefined;
  }
}

/**
 * Current outdoor PM2.5 for a location, used for the live reading on the landing
 * page. Returns undefined instead of throwing, because the page must still work
 * when air data is unavailable.
 */
export async function fetchCurrentPm25(lat: number, lng: number): Promise<number | undefined> {
  const air = await fetchCurrentAir(lat, lng);
  return air?.pm25;
}
