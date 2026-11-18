import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGeminiApiKey, hasGeminiKey, isDemoMode } from "../env";
import { AppError } from "../security/errors";

/**
 * Default Flash-Lite model name, confirmed live from models list and env-overridable.
 * Used for all structured intake, plan explanation, and query answering calls.
 */
export const DEFAULT_FLASH_LITE_MODEL =
  process.env.GEMINI_FLASH_LITE_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

/**
 * Secondary Flash model name, confirmed live from models list and env-overridable.
 */
export const DEFAULT_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL ?? "gemini-2.5-flash";

/**
 * Mandatory medical and emergency scope disclaimer embedded in all system instructions.
 */
export const SCOPE_LIMIT_DISCLAIMER =
  "This is general air-quality guidance, not medical advice; people with health conditions should follow their doctor; in an emergency contact local emergency services.";

/** In-memory metrics counters for Gemini operations and plan caching. */
export const geminiMetrics = {
  calls: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

/** Request configuration options for structured Gemini operations. */
export interface GenerateStructuredOptions<T> {
  model?: string;
  system: string;
  contents: string;
  responseSchema?: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  demoFixture?: () => T;
  timeoutMs?: number;
  maxRetries?: number;
}

function isRetryableGeminiError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("INTERNAL")
  );
}

/**
 * Core structured Gemini generation helper.
 * Enforces responseSchema constraints on the model, re-validates output with Zod,
 * applies a 25s timeout, restricts retries to 429/5xx, and falls back to demo fixtures.
 */
export async function generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
  if (isDemoMode() || !hasGeminiKey()) {
    if (options.demoFixture) {
      const fixtureData = options.demoFixture();
      return options.zodSchema.parse(fixtureData);
    }
    throw new AppError(500, "Gemini API key is not configured and no demo fixture is available.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    if (options.demoFixture) return options.zodSchema.parse(options.demoFixture());
    throw new AppError(500, "Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
  const modelName = options.model ?? DEFAULT_FLASH_LITE_MODEL;
  const fullSystem = `${options.system}\n\n${SCOPE_LIMIT_DISCLAIMER}`;
  const timeoutMs = options.timeoutMs ?? 25000;
  const maxRetries = options.maxRetries ?? 2;

  let attempt = 0;
  let backoffMs = 500;

  while (attempt <= maxRetries) {
    try {
      geminiMetrics.calls += 1;

      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        config: {
          systemInstruction: fullSystem,
          responseMimeType: "application/json",
          ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
        },
      });

      let timeoutTimer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new AppError(504, `Gemini request timed out after ${timeoutMs / 1000}s.`));
        }, timeoutMs);
      });

      const response = await Promise.race([callPromise, timeoutPromise]).finally(() => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      });

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new AppError(502, "Gemini returned an empty response.");
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        throw new AppError(502, "Gemini output is not valid JSON.");
      }

      const validated = options.zodSchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new AppError(502, "Gemini output failed schema validation.");
      }

      return validated.data;
    } catch (err: unknown) {
      if (err instanceof AppError && err.status === 504) throw err;
      if (err instanceof AppError && err.status === 502 && (err.message.includes("schema") || err.message.includes("valid JSON"))) {
        throw err;
      }

      if (isRetryableGeminiError(err) && attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      throw new AppError(502, "Failed to generate structured response from Gemini.");
    }
  }

  throw new AppError(502, "Gemini request retries exhausted.");
}
