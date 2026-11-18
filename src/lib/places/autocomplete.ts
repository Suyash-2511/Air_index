import { z } from "zod";
import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { googleJson } from "../google/http";
import { AppError } from "../security/errors";
import { getFixturePlaceDetails, getFixturePredictions } from "./fixtures";

/** Autocomplete suggestion prediction returned to clients. */
export interface AutocompletePrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

/** Complete geographical details for a selected place. */
export interface PlaceDetails {
  placeId: string;
  label: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

/** Explicit field mask restricting Google Places API (New) billing to basic fields. */
export const PLACE_DETAILS_FIELD_MASK = "location,displayName,formattedAddress";

const placesApiBaseUrl = "https://places.googleapis.com/v1/places";

const autocompleteResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            place: z.string().optional(),
            placeId: z.string().optional(),
            text: z.object({ text: z.string() }).optional(),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string() }).optional(),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const placeDetailsResponseSchema = z.object({
  id: z.string().optional(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

/**
 * Searches location suggestions using Google Places API (New) with session token optimization.
 * Constrained strictly to India (`includedRegionCodes: ["in"]`).
 */
export async function fetchAutocomplete(input: string, sessionToken?: string): Promise<AutocompletePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new AppError(400, "Search query must be between 2 and 100 characters.");
  }

  if (!hasAirKey()) {
    return getFixturePredictions(trimmed);
  }

  const key = getGoogleMapsApiKey();
  if (!key) return getFixturePredictions(trimmed);

  const payload: Record<string, unknown> = {
    input: trimmed,
    includedRegionCodes: ["in"],
  };
  if (sessionToken) payload.sessionToken = sessionToken;

  const raw = await googleJson(`${placesApiBaseUrl}:autocomplete`, key, { body: payload });
  const parsed = autocompleteResponseSchema.parse(raw);
  const suggestions = parsed.suggestions ?? [];

  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => {
      const placeId = p.placeId ?? (p.place ? p.place.replace(/^places\//, "") : "");
      const primaryText = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      const secondaryText = p.structuredFormat?.secondaryText?.text ?? "";
      return { placeId, primaryText, secondaryText };
    })
    .filter((p) => p.placeId.length > 0);
}

/**
 * Retrieves coordinates and formatted address for a chosen place using Places API (New).
 * Always supplies X-Goog-FieldMask to ensure strict data scoping.
 */
export async function fetchPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
  const trimmedId = placeId.trim();
  if (!trimmedId) {
    throw new AppError(400, "Place ID is required.");
  }

  if (!hasAirKey() || trimmedId.startsWith("fixture-")) {
    return getFixturePlaceDetails(trimmedId);
  }

  const key = getGoogleMapsApiKey();
  if (!key) return getFixturePlaceDetails(trimmedId);

  const tokenParam = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const url = `${placesApiBaseUrl}/${encodeURIComponent(trimmedId)}${tokenParam}`;

  const raw = await googleJson(url, key, {
    headers: { "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK },
  });

  const parsed = placeDetailsResponseSchema.parse(raw);
  const label = parsed.displayName?.text ?? parsed.formattedAddress ?? "Selected Location";

  return {
    placeId: parsed.id ?? trimmedId,
    label,
    lat: parsed.location?.latitude ?? 0,
    lng: parsed.location?.longitude ?? 0,
    formattedAddress: parsed.formattedAddress ?? label,
  };
}
