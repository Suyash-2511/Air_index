import { airCache, autocompleteCache, geocodeCache, planCache, tileCache, type CacheStats } from "./cache";
import { hasAirKey, hasGeminiKey } from "./env";

/** Whether a dependency is calling the real service or running on fixtures. */
export type ServiceMode = "live" | "demo";

/** Shape of the /api/health response. Contains no keys, hosts or user data. */
export interface HealthReport {
  status: "ok";
  uptimeSeconds: number;
  services: {
    gemini: ServiceMode;
    airQuality: ServiceMode;
    places: ServiceMode;
    staticMaps: ServiceMode;
  };
  caches: Record<"air" | "places" | "geocode" | "tiles" | "plans", CacheStats>;
}

const startedAt = Date.now();

/** Reports service modes and cache efficiency for uptime checks and demos. */
export function getHealthReport(now = Date.now()): HealthReport {
  const maps: ServiceMode = hasAirKey() ? "live" : "demo";
  return {
    status: "ok",
    uptimeSeconds: Math.max(0, Math.round((now - startedAt) / 1000)),
    services: {
      gemini: hasGeminiKey() ? "live" : "demo",
      airQuality: maps,
      places: maps,
      staticMaps: maps,
    },
    caches: {
      air: airCache.getStats(),
      places: autocompleteCache.getStats(),
      geocode: geocodeCache.getStats(),
      tiles: tileCache.getStats(),
      plans: planCache.getStats(),
    },
  };
}
