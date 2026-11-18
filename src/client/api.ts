import type { Location, Household } from "@/lib/types";
import type {
  AskApiResponse,
  IntakeApiResponse,
  PlanApiResponse,
  PlaceSuggestion,
} from "./types";

async function readError(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(body.error ?? fallback);
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
  const data = (await res.json()) as {
    predictions?: { placeId: string; primaryText: string; secondaryText: string }[];
  };
  return (data.predictions ?? []).map((p) => ({
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
  const data = (await res.json()) as { place?: { label: string; lat: number; lng: number } };
  if (!data.place) throw new Error("Could not open that place. Pick another.");
  return { label: data.place.label, lat: data.place.lat, lng: data.place.lng };
}

/** Reverse-geocodes browser coordinates into an Indian location model. */
export async function fetchReverseGeocode(lat: number, lng: number): Promise<Location> {
  const res = await postJson("/api/geocode", { lat, lng });
  if (!res.ok) throw await readError(res, "Could not name your area. Search for it instead.");
  const data = (await res.json()) as { location?: { label: string; lat: number; lng: number } };
  if (!data.location) throw new Error("Could not name your area. Search for it instead.");
  return { label: data.location.label, lat: data.location.lat, lng: data.location.lng };
}

/** Extracts household structure and activity schedules from freeform user descriptions. */
export async function submitIntake(
  text: string,
  location: Location,
): Promise<IntakeApiResponse> {
  const res = await fetch("/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, location }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to parse household intake");
  }
  return (await res.json()) as IntakeApiResponse;
}

/** Computes whole-day physical exposure doses and ranked interventions for a household. */
export async function computePlan(household: Household): Promise<PlanApiResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ household }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to compute exposure plan");
  }
  return (await res.json()) as PlanApiResponse;
}

/** Submits a follow-up question grounded strictly in the computed plan and household data. */
export async function askPlanQuestion(
  question: string,
  household: Household,
): Promise<AskApiResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, household }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to answer plan question");
  }
  return (await res.json()) as AskApiResponse;
}

/**
 * Current outdoor PM2.5 for a location, used for the live reading on the landing
 * page. Returns undefined instead of throwing, because the page must still work
 * when air data is unavailable.
 */
export async function fetchCurrentPm25(lat: number, lng: number): Promise<number | undefined> {
  try {
    const res = await fetch("/api/air", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { current?: { pm25?: unknown } };
    const pm25 = data.current?.pm25;
    return typeof pm25 === "number" && Number.isFinite(pm25) ? pm25 : undefined;
  } catch {
    return undefined;
  }
}
