import { z } from "zod";
import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { googleJson } from "../google";
import { AppError, HTTP_STATUS } from "../security";
import { getFixturePlaceDetails, getFixturePredictions } from "./fixtures";
import type { AutocompletePrediction, PlaceDetails } from "./types";

export type { AutocompletePrediction, PlaceDetails };

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

type PlacePrediction = NonNullable<NonNullable<z.infer<typeof autocompleteResponseSchema>["suggestions"]>[number]["placePrediction"]>;
type PlaceDetailsResponse = z.infer<typeof placeDetailsResponseSchema>;

/** Shortest and longest search text worth sending; below the minimum nothing useful can match. */
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
/** Place ids the fixtures hand out, so the demo never calls Google for them. */
const FIXTURE_ID_PREFIX = "fixture-";

/** Google names the place as "places/<id>" in one field and as a bare id in another; clients get the bare id. */
function placeIdOf(prediction: PlacePrediction): string {
  return prediction.placeId ?? (prediction.place ? prediction.place.replace(/^places\//, "") : "");
}

function toPrediction(prediction: PlacePrediction): AutocompletePrediction {
  return {
    placeId: placeIdOf(prediction),
    primaryText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "",
    secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
  };
}

/**
 * Searches location suggestions using Google Places API (New) with session token optimization.
 * Constrained strictly to India (`includedRegionCodes: ["in"]`).
 */
export async function fetchAutocomplete(input: string, sessionToken?: string): Promise<AutocompletePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < MIN_QUERY_LENGTH || trimmed.length > MAX_QUERY_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Search query must be between 2 and 100 characters.");
  }

  const key = getGoogleMapsApiKey();
  if (!hasAirKey() || !key) return getFixturePredictions(trimmed);

  const payload: Record<string, unknown> = { input: trimmed, includedRegionCodes: ["in"] };
  if (sessionToken) payload.sessionToken = sessionToken;

  const raw = await googleJson(`${placesApiBaseUrl}:autocomplete`, key, { body: payload });
  const suggestions = autocompleteResponseSchema.parse(raw).suggestions ?? [];

  return suggestions
    .flatMap((suggestion) => (suggestion.placePrediction ? [toPrediction(suggestion.placePrediction)] : []))
    .filter((prediction) => prediction.placeId.length > 0);
}

/** Shapes Google's place response, naming the place by its display name, then address, then a default. */
function toPlaceDetails(response: PlaceDetailsResponse, requestedId: string): PlaceDetails {
  const label = response.displayName?.text ?? response.formattedAddress ?? "Selected Location";
  return {
    placeId: response.id ?? requestedId,
    label,
    lat: response.location?.latitude ?? 0,
    lng: response.location?.longitude ?? 0,
    formattedAddress: response.formattedAddress ?? label,
  };
}

/**
 * Retrieves coordinates and formatted address for a chosen place using Places API (New).
 * Always supplies X-Goog-FieldMask to ensure strict data scoping.
 */
export async function fetchPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
  const trimmedId = placeId.trim();
  if (!trimmedId) throw new AppError(HTTP_STATUS.BAD_REQUEST, "Place ID is required.");

  const key = getGoogleMapsApiKey();
  if (!hasAirKey() || trimmedId.startsWith(FIXTURE_ID_PREFIX) || !key) return getFixturePlaceDetails(trimmedId);

  const tokenParam = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const raw = await googleJson(`${placesApiBaseUrl}/${encodeURIComponent(trimmedId)}${tokenParam}`, key, {
    headers: { "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK },
  });
  return toPlaceDetails(placeDetailsResponseSchema.parse(raw), trimmedId);
}
