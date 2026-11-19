import { z } from "zod";
import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { googleJson } from "../google";
import { getFixtureReverseGeocode } from "./fixtures";
import type { ReverseGeocodeResult } from "./types";

export type { ReverseGeocodeResult };

const addressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
});

const geocodeResultSchema = z.object({
  formatted_address: z.string(),
  address_components: z.array(addressComponentSchema),
});

const geocodeResponseSchema = z.object({
  status: z.string(),
  results: z.array(geocodeResultSchema).optional(),
});

type AddressComponent = z.infer<typeof addressComponentSchema>;

/** Component types that name a neighbourhood, a city, and a district, in the order Google uses them. */
const NEIGHBOURHOOD_TYPES = ["sublocality", "sublocality_level_1", "neighborhood"];
const CITY_TYPES = ["locality", "postal_town"];
const DISTRICT_TYPES = ["administrative_area_level_2"];
/** How many comma-separated parts of the full address are kept when no component names a place. */
const FALLBACK_ADDRESS_PARTS = 2;

/** The name of the first address component of any of the given types, or "" when there is none. */
function firstNameOfType(components: ReadonlyArray<AddressComponent>, types: readonly string[]): string {
  return (
    components
      .filter((component) => component.types.some((type) => types.includes(type)))
      .map((component) => component.long_name)
      .find(Boolean) ?? ""
  );
}

/**
 * Extracts a concise human-readable location label (e.g. "Connaught Place, New Delhi")
 * from Google Geocoding address components.
 */
export function extractShortLabel(components: ReadonlyArray<AddressComponent>, fallbackAddress: string): string {
  const neighbourhood = firstNameOfType(components, NEIGHBOURHOOD_TYPES);
  const city = firstNameOfType(components, CITY_TYPES) || firstNameOfType(components, DISTRICT_TYPES);
  if (neighbourhood && city && neighbourhood !== city) return `${neighbourhood}, ${city}`;

  const parts = fallbackAddress.split(",").map((part) => part.trim());
  return city || neighbourhood || parts.slice(0, FALLBACK_ADDRESS_PARTS).join(", ") || fallbackAddress;
}

/**
 * Reverse geocodes geographical coordinates to a friendly short label for current location selection.
 * Uses X-Goog-Api-Key header authentication, falling back to regional fixtures in demo mode.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = getGoogleMapsApiKey();
  if (!hasAirKey() || !key) return getFixtureReverseGeocode(lat, lng);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}`;
  const raw = await googleJson(url, key);
  const parsed = geocodeResponseSchema.parse(raw);
  const firstResult = parsed.results?.[0];

  if (!firstResult) return getFixtureReverseGeocode(lat, lng);

  return {
    label: extractShortLabel(firstResult.address_components, firstResult.formatted_address),
    formattedAddress: firstResult.formatted_address,
    lat,
    lng,
  };
}
