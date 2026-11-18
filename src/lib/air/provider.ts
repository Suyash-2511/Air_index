import type { HourlyAir, Location } from "../types";

/**
 * Common contract for air quality providers (Google Maps Air Quality API, offline fixtures).
 * Decouples exposure calculations and UI from external weather and sensor providers.
 */
export interface AirProvider {
  /**
   * Retrieves the current air quality conditions for the given location.
   * Returns the current hour's HourlyAir reading.
   */
  current(location: Location): Promise<HourlyAir>;

  /**
   * Retrieves hourly air quality forecast for the given location and requested number of hours.
   * Readings are mapped to local clock hours (0–23) of the target location.
   */
  forecast(location: Location, hours: number): Promise<HourlyAir[]>;
}
