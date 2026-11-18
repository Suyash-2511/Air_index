import type { Location, Household } from "@/lib/types";
import type {
  AskApiResponse,
  IntakeApiResponse,
  PlanApiResponse,
  PlaceSuggestion,
} from "./types";

/** Fetches location suggestions for Indian cities and addresses via Places autocomplete. */
export async function fetchPlaceSuggestions(
  query: string,
  sessionToken: string,
): Promise<readonly PlaceSuggestion[]> {
  const url = `/api/places?q=${encodeURIComponent(query)}&token=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to fetch place suggestions");
  }
  const data = (await res.json()) as { suggestions?: PlaceSuggestion[] };
  return data.suggestions ?? [];
}

/** Resolves a Place ID into geographic coordinates and an official label. */
export async function fetchPlaceLocation(
  placeId: string,
  sessionToken: string,
): Promise<Location> {
  const url = `/api/places/${encodeURIComponent(placeId)}?token=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to resolve place location");
  }
  return (await res.json()) as Location;
}

/** Reverse-geocodes browser coordinates into an Indian location model. */
export async function fetchReverseGeocode(lat: number, lng: number): Promise<Location> {
  const url = `/api/geocode?lat=${lat}&lng=${lng}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorJson.error ?? "Failed to geocode current location");
  }
  return (await res.json()) as Location;
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
