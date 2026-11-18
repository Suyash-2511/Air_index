import { z } from "zod";
import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { googleJson } from "../google/http";
import { getFixtureReverseGeocode } from "./fixtures";

/** Reverse geocoding result with user-friendly label. */
export interface ReverseGeocodeResult {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

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

/**
 * Extracts a concise human-readable location label (e.g. "Connaught Place, New Delhi")
 * from Google Geocoding address components.
 */
export function extractShortLabel(components: ReadonlyArray<AddressComponent>, fallbackAddress: string): string {
  let sublocality = "";
  let locality = "";
  let adminArea2 = "";

  for (const comp of components) {
    if (comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1") || comp.types.includes("neighborhood")) {
      if (!sublocality) sublocality = comp.long_name;
    }
    if (comp.types.includes("locality") || comp.types.includes("postal_town")) {
      if (!locality) locality = comp.long_name;
    }
    if (comp.types.includes("administrative_area_level_2")) {
      if (!adminArea2) adminArea2 = comp.long_name;
    }
  }

  const city = locality || adminArea2;
  if (sublocality && city && sublocality !== city) {
    return `${sublocality}, ${city}`;
  }
  if (city) return city;
  if (sublocality) return sublocality;

  const parts = fallbackAddress.split(",").map((s) => s.trim());
  return parts.slice(0, 2).join(", ") || fallbackAddress;
}

/**
 * Reverse geocodes geographical coordinates to a friendly short label for current location selection.
 * Uses X-Goog-Api-Key header authentication, falling back to regional fixtures in demo mode.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!hasAirKey()) {
    return getFixtureReverseGeocode(lat, lng);
  }

  const key = getGoogleMapsApiKey();
  if (!key) return getFixtureReverseGeocode(lat, lng);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}`;
  const raw = await googleJson(url, key);
  const parsed = geocodeResponseSchema.parse(raw);
  const firstResult = parsed.results?.[0];

  if (!firstResult) {
    return getFixtureReverseGeocode(lat, lng);
  }

  const label = extractShortLabel(firstResult.address_components, firstResult.formatted_address);

  return {
    label,
    formattedAddress: firstResult.formatted_address,
    lat,
    lng,
  };
}
