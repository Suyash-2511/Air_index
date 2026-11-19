import { z } from "zod";

/**
 * Zod schema defining allowable environment variables.
 * All keys are marked optional so Saans can run in offline demo mode without configuration.
 */
const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_FLASH_LITE_MODEL: z.string().optional(),
  GEMINI_FLASH_MODEL: z.string().optional(),
});

/** Validated environment variable structure inferred from schema. */
type Env = z.infer<typeof envSchema>;

/**
 * Reads and validates environment variables from process.env.
 * Never throws; returns an empty object if validation fails so demo mode works seamlessly.
 */
function getEnv(): Env {
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
  const key = getEnv().GOOGLE_MAPS_API_KEY?.trim();
  return typeof key === "string" && key.length > 0;
}

/**
 * Checks whether a valid Gemini API key is configured.
 * Used by Gemini services to decide between live LLM calls and deterministic fixtures.
 */
export function hasGeminiKey(): boolean {
  const key = getEnv().GEMINI_API_KEY?.trim();
  return typeof key === "string" && key.length > 0;
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
 * Used exclusively by server-side air quality and places fetchers.
 */
export function getGoogleMapsApiKey(): string | undefined {
  const key = getEnv().GOOGLE_MAPS_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

/**
 * Safely accesses the Gemini API key without exposing it to client components.
 * Used exclusively by server-side Gemini client operations.
 */
export function getGeminiApiKey(): string | undefined {
  const key = getEnv().GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}
