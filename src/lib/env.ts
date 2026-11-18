import { z } from "zod";

/**
 * Zod schema defining allowable environment variables.
 * All keys are marked optional so Saans can run in offline demo mode without configuration.
 */
export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
});

/** Validated environment variable structure inferred from schema. */
export type Env = z.infer<typeof envSchema>;

/**
 * Reads and validates environment variables from process.env.
 * Never throws; returns an empty object if validation fails so demo mode works seamlessly.
 */
export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    return {};
  }
  return result.data;
}

/**
 * Checks whether a valid Google Maps API key is configured.
 * Used by air quality providers to decide between real API calls and offline fixtures.
 */
export function hasAirKey(): boolean {
  const env = getEnv();
  return typeof env.GOOGLE_MAPS_API_KEY === "string" && env.GOOGLE_MAPS_API_KEY.length > 0;
}

/**
 * Checks whether the application should run in demo mode.
 * Returns true if the air quality key is absent, ensuring no crashes on unconfigured runs.
 */
export function isDemoMode(): boolean {
  return !hasAirKey();
}

/**
 * Safely accesses the Google Maps API key without exposing it to client components.
 * Used exclusively by server-side air and pollen fetchers.
 */
export function getGoogleMapsApiKey(): string | undefined {
  return getEnv().GOOGLE_MAPS_API_KEY;
}
