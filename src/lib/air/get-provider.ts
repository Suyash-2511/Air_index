import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { FixtureAirProvider } from "./fixtures";
import { GoogleAirQualityProvider } from "./google-air-quality";
import type { AirProvider } from "./provider";

/**
 * Returns the appropriate AirProvider based on environment configuration.
 * Automatically delegates to Google Maps Air Quality API when GOOGLE_MAPS_API_KEY is present,
 * and gracefully falls back to deterministic local fixtures in demo mode.
 */
export function getAirProvider(): AirProvider {
  if (hasAirKey()) {
    const key = getGoogleMapsApiKey();
    if (key) {
      return new GoogleAirQualityProvider(key);
    }
  }
  return new FixtureAirProvider();
}
