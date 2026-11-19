import { AppError, HTTP_STATUS } from "../security";
import { MILLISECONDS_PER_SECOND } from "../time-units";

/** Request configuration options for communicating with Google API endpoints. */
interface GoogleHttpOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

/**
 * Strips any sensitive API key references from URLs or error text before propagation.
 */
function sanitizeMessage(message: string, apiKey: string): string {
  if (!apiKey) return message;
  const escaped = apiKey.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return message.replace(new RegExp(escaped, "g"), "[REDACTED]").replace(/key=[^&]+/gi, "key=[REDACTED]");
}

/** How long one attempt may take before it is abandoned. */
const DEFAULT_TIMEOUT_MS = 10_000;
/** Retries after the first attempt, for rate limits and server errors only. */
const DEFAULT_MAX_RETRIES = 2;
/** Wait before the first retry; it doubles each time so a struggling service is not hammered. */
const DEFAULT_INITIAL_BACKOFF_MS = 500;

/** One attempt either got a response (any status) or threw before getting one. */
type Attempt = { kind: "response"; response: Response } | { kind: "thrown"; error: unknown };

/** Rate limits and server errors are worth another try; client errors are not. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Sends one request that is aborted if it takes longer than the timeout. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Runs one attempt and reports what happened instead of throwing, so the retry loop reads linearly. */
async function attemptRequest(url: string, init: RequestInit, timeoutMs: number): Promise<Attempt> {
  try {
    return { kind: "response", response: await fetchWithTimeout(url, init, timeoutMs) };
  } catch (error: unknown) {
    return { kind: "thrown", error };
  }
}

/** Builds the client-safe error for a failed response, using the provider's message when it sent one. */
async function errorFromResponse(response: Response, url: string, apiKey: string): Promise<AppError> {
  let detail = `Google API returned HTTP ${response.status}.`;
  try {
    const body = await response.json();
    if (body?.error?.message) detail = sanitizeMessage(String(body.error.message), apiKey);
  } catch {
    // The body was not JSON; the status line above is the best detail left.
  }
  // Server log only (never sent to the client): which upstream failed and why.
  console.error(`[google] ${new URL(url).hostname} HTTP ${response.status}: ${detail}`);
  return new AppError(response.status >= 500 ? 502 : response.status, detail);
}

/** Builds the request init: key header always, JSON content type when there is a body. */
function buildRequestInit(apiKey: string, options: GoogleHttpOptions): RequestInit {
  const headers: Record<string, string> = { "X-Goog-Api-Key": apiKey, ...(options.headers ?? {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };
}

/** What the retry loop knows about the attempt it is judging. */
interface AttemptContext {
  url: string;
  apiKey: string;
  timeoutMs: number;
  /** False on the last attempt, when any failure is final. */
  canRetry: boolean;
}

/** The error to raise for an attempt that threw, or undefined when the attempt may be retried. */
function failureFromThrown(error: unknown, { apiKey, timeoutMs, canRetry }: AttemptContext): AppError | undefined {
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError(HTTP_STATUS.GATEWAY_TIMEOUT, `Google API request timed out after ${timeoutMs / MILLISECONDS_PER_SECOND}s.`);
  }
  if (canRetry) return undefined;
  return new AppError(HTTP_STATUS.BAD_GATEWAY, sanitizeMessage(error instanceof Error ? error.message : "Network failure", apiKey));
}

/** Judges one attempt: a response to return, an error to throw, or undefined to try again. */
async function settleAttempt(attempt: Attempt, context: AttemptContext): Promise<Response | undefined> {
  if (attempt.kind === "thrown") {
    const failure = failureFromThrown(attempt.error, context);
    if (failure) throw failure;
    return undefined;
  }
  if (attempt.response.ok) return attempt.response;
  if (isRetryableStatus(attempt.response.status) && context.canRetry) return undefined;
  throw await errorFromResponse(attempt.response, context.url, context.apiKey);
}

/**
 * Core HTTP helper for Google Maps Platform APIs.
 * Enforces X-Goog-Api-Key header authentication, a 10s default timeout,
 * and up to 2 exponential backoff retries restricted to HTTP 429 and 5xx.
 */
export async function googleRequest(
  url: string,
  apiKey: string,
  options: GoogleHttpOptions = {},
): Promise<Response> {
  if (!apiKey) throw new AppError(HTTP_STATUS.INTERNAL_ERROR, "Google API key is not configured.");

  const init = buildRequestInit(apiKey, options);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  let backoffMs = options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await attemptRequest(url, init, timeoutMs);
    const settled = await settleAttempt(result, { url, apiKey, timeoutMs, canRetry: attempt < maxRetries });
    if (settled) return settled;

    await sleep(backoffMs);
    backoffMs *= 2;
  }

  throw new AppError(HTTP_STATUS.BAD_GATEWAY, "Google API retries exhausted.");
}

/**
 * Convenience wrapper returning parsed JSON from Google API requests.
 */
export async function googleJson<T = unknown>(
  url: string,
  apiKey: string,
  options: GoogleHttpOptions = {},
): Promise<T> {
  const response = await googleRequest(url, apiKey, options);
  // Callers pass the result through a zod schema; T only names what they expect to find.
  return (await response.json()) as T;
}

/**
 * Convenience wrapper returning raw binary Uint8Array from Google API requests.
 */
export async function googleBinary(
  url: string,
  apiKey: string,
  options: GoogleHttpOptions = {},
): Promise<Uint8Array> {
  const response = await googleRequest(url, apiKey, options);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
