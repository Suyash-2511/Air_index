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

/** Reverse geocoding result with user-friendly label. */
export interface ReverseGeocodeResult {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}
