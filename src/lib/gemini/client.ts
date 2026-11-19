import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGeminiApiKey, hasGeminiKey, isDemoMode } from "../env";
import { AppError, HTTP_STATUS } from "../security";
import { MILLISECONDS_PER_SECOND } from "../time-units";

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

/** How long one Gemini call may take before it is abandoned. */
const DEFAULT_TIMEOUT_MS = 25_000;
/** Retries after the first attempt, for rate limits and server errors only. */
const DEFAULT_MAX_RETRIES = 2;
/** Wait before the first retry; it doubles each time. */
const INITIAL_BACKOFF_MS = 500;

/** Longest slice of an error message written to the server log, so a long upstream message cannot flood it. */
const LOGGED_MESSAGE_LENGTH = 200;

/** Fragments of upstream error text that mean "try again": rate limits and server-side failures. */
const RETRYABLE_ERROR_MARKERS = ["429", "RESOURCE_EXHAUSTED", "500", "503", "UNAVAILABLE", "INTERNAL"];

function isRetryableGeminiError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return RETRYABLE_ERROR_MARKERS.some((marker) => message.includes(marker));
}

/** Failures that retrying cannot fix: a timeout, or output that is structurally wrong. */
function isTerminalError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  const isBadOutput = err.status === 502 && (err.message.includes("schema") || err.message.includes("valid JSON"));
  return err.status === 504 || isBadOutput;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Races a model call against a timer so a hung request fails instead of waiting forever. */
async function callWithTimeout<R>(call: Promise<R>, timeoutMs: number): Promise<R> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError(HTTP_STATUS.GATEWAY_TIMEOUT, `Gemini request timed out after ${timeoutMs / MILLISECONDS_PER_SECOND}s.`));
    }, timeoutMs);
  });
  return Promise.race([call, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Parses and validates the model's text; each failure is a distinct, client-safe 502. */
function parseModelText<T>(text: string | undefined, schema: z.ZodType<T>): T {
  if (!text || text.trim().length === 0) throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Gemini returned an empty response.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Gemini output is not valid JSON.");
  }

  const validated = schema.safeParse(json);
  if (!validated.success) throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Gemini output failed schema validation.");
  return validated.data;
}

/** Demo mode and a missing key both serve the deterministic fixture, or fail clearly when there is none. */
function fixtureOrThrow<T>(options: GenerateStructuredOptions<T>, missingFixtureMessage: string): T {
  if (options.demoFixture) return options.zodSchema.parse(options.demoFixture());
  throw new AppError(HTTP_STATUS.INTERNAL_ERROR, missingFixtureMessage);
}

/** One model call, validated; the scope disclaimer is appended to every system instruction. */
async function generateOnce<T>(ai: GoogleGenAI, options: GenerateStructuredOptions<T>, timeoutMs: number): Promise<T> {
  geminiMetrics.calls += 1;
  const response = await callWithTimeout(
    ai.models.generateContent({
      model: options.model ?? DEFAULT_FLASH_LITE_MODEL,
      contents: options.contents,
      config: {
        systemInstruction: `${options.system}

${SCOPE_LIMIT_DISCLAIMER}`,
        responseMimeType: "application/json",
        ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
      },
    }),
    timeoutMs,
  );
  return parseModelText(response.text, options.zodSchema);
}

/** Calls the model, validating each answer and retrying only failures that can succeed on a retry. */
async function generateWithRetries<T>(options: GenerateStructuredOptions<T>, apiKey: string): Promise<T> {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  let backoffMs = INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await generateOnce(ai, options, timeoutMs);
    } catch (err: unknown) {
      // Server log only: the reason a Gemini call failed (no prompt or key content).
      console.error(`[gemini] attempt ${attempt + 1} failed: ${err instanceof Error ? err.message.slice(0, LOGGED_MESSAGE_LENGTH) : "unknown error"}`);
      if (isTerminalError(err)) throw err;
      if (!(isRetryableGeminiError(err) && attempt < maxRetries)) {
        throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Failed to generate structured response from Gemini.");
      }
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Gemini request retries exhausted.");
}

/**
 * Core structured Gemini generation helper.
 * Enforces responseSchema constraints on the model, re-validates output with Zod,
 * applies a 25s timeout, restricts retries to 429/5xx, and falls back to demo fixtures.
 */
export async function generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
  if (isDemoMode() || !hasGeminiKey()) {
    return fixtureOrThrow(options, "Gemini API key is not configured and no demo fixture is available.");
  }
  const apiKey = getGeminiApiKey();
  if (!apiKey) return fixtureOrThrow(options, "Gemini API key is not configured.");
  return generateWithRetries(options, apiKey);
}
