import type { AutocompletePrediction, PlaceDetails } from "./autocomplete";
import type { ReverseGeocodeResult } from "./geocode";

interface FixturePlace extends PlaceDetails {
  primaryText: string;
  secondaryText: string;
}

/**
 * Deterministic demo places for Indian metropolitan and tier-2 regions.
 * Enables offline searching, UI prototyping, and testing without live Maps credentials.
 */
export const DEMO_PLACES: readonly FixturePlace[] = [
  {
    placeId: "fixture-delhi-connaught",
    primaryText: "Connaught Place",
    secondaryText: "New Delhi, Delhi, India",
    label: "Connaught Place, New Delhi",
    formattedAddress: "Connaught Place, New Delhi, Delhi 110001, India",
    lat: 28.6315,
    lng: 77.2167,
  },
  {
    placeId: "fixture-delhi-chandni",
    primaryText: "Chandni Chowk",
    secondaryText: "Old Delhi, Delhi, India",
    label: "Chandni Chowk, Old Delhi",
    formattedAddress: "Chandni Chowk, Old Delhi, Delhi 110006, India",
    lat: 28.6506,
    lng: 77.2303,
  },
  {
    placeId: "fixture-mumbai-bandra",
    primaryText: "Bandra West",
    secondaryText: "Mumbai, Maharashtra, India",
    label: "Bandra West, Mumbai",
    formattedAddress: "Bandra West, Mumbai, Maharashtra 400050, India",
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    placeId: "fixture-mumbai-marine",
    primaryText: "Marine Drive",
    secondaryText: "Mumbai, Maharashtra, India",
    label: "Marine Drive, Mumbai",
    formattedAddress: "Marine Drive, Mumbai, Maharashtra 400020, India",
    lat: 18.9432,
    lng: 72.823,
  },
  {
    placeId: "fixture-nashik-panchavati",
    primaryText: "Panchavati",
    secondaryText: "Nashik, Maharashtra, India",
    label: "Panchavati, Nashik",
    formattedAddress: "Panchavati, Nashik, Maharashtra 422003, India",
    lat: 20.0063,
    lng: 73.7903,
  },
  {
    placeId: "fixture-nashik-college",
    primaryText: "College Road",
    secondaryText: "Nashik, Maharashtra, India",
    label: "College Road, Nashik",
    formattedAddress: "College Road, Nashik, Maharashtra 422005, India",
    lat: 20.0094,
    lng: 73.7645,
  },
];

/** Matches user search terms against deterministic demo places. */
export function getFixturePredictions(input: string): AutocompletePrediction[] {
  const query = input.trim().toLowerCase();
  const matched = DEMO_PLACES.filter(
    (p) =>
      p.primaryText.toLowerCase().includes(query) ||
      p.secondaryText.toLowerCase().includes(query) ||
      p.label.toLowerCase().includes(query),
  );

  return (matched.length > 0 ? matched : DEMO_PLACES.slice(0, 3)).map((p) => ({
    placeId: p.placeId,
    primaryText: p.primaryText,
    secondaryText: p.secondaryText,
  }));
}

/** Looks up place details from demo fixtures. */
export function getFixturePlaceDetails(placeId: string): PlaceDetails {
  const found = DEMO_PLACES.find((p) => p.placeId === placeId);
  const fallback = DEMO_PLACES[0] ?? {
    placeId: "fixture-fallback",
    label: "New Delhi",
    lat: 28.6139,
    lng: 77.209,
    formattedAddress: "New Delhi, Delhi, India",
    primaryText: "New Delhi",
    secondaryText: "India",
  };
  const target = found ?? fallback;

  return {
    placeId: target.placeId,
    label: target.label,
    lat: target.lat,
    lng: target.lng,
    formattedAddress: target.formattedAddress,
  };
}

/** Calculates the closest regional demo location for reverse geocoding. */
export function getFixtureReverseGeocode(lat: number, lng: number): ReverseGeocodeResult {
  const centers = [
    { label: "Connaught Place, New Delhi", address: "Connaught Place, New Delhi, Delhi 110001, India", lat: 28.61, lng: 77.21 },
    { label: "Bandra, Mumbai", address: "Bandra West, Mumbai, Maharashtra 400050, India", lat: 19.08, lng: 72.88 },
    { label: "Panchavati, Nashik", address: "Panchavati, Nashik, Maharashtra 422003, India", lat: 20.0, lng: 73.78 },
  ];

  let closest = centers[0] ?? { label: "New Delhi", address: "New Delhi, India", lat, lng };
  let minD = Infinity;

  for (const c of centers) {
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < minD) {
      minD = d;
      closest = c;
    }
  }

  return {
    label: closest.label,
    formattedAddress: closest.address,
    lat,
    lng,
  };
}
