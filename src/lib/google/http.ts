import { AppError } from "../security/errors";

/** Request configuration options for communicating with Google API endpoints. */
export interface GoogleHttpOptions {
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
  if (!apiKey) {
    throw new AppError(500, "Google API key is not configured.");
  }

  const method = options.method ?? (options.body ? "POST" : "GET");
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.maxRetries ?? 2;
  let backoffMs = options.initialBackoffMs ?? 500;
  let attempt = 0;

  const headers: Record<string, string> = {
    "X-Goog-Api-Key": apiKey,
    ...(options.headers ?? {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const bodyPayload = options.body ? JSON.stringify(options.body) : undefined;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
        ...(bodyPayload !== undefined ? { body: bodyPayload } : {}),
      };
      const response = await fetch(url, init);
      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      const status = response.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (isRetryable && attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      let errorDetail = `Google API returned HTTP ${status}.`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorDetail = sanitizeMessage(String(errJson.error.message), apiKey);
        }
      } catch {
        // Fall back to default error detail
      }

      throw new AppError(status >= 500 ? 502 : status, errorDetail);
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError(504, "Google API request timed out after 10s.");
      }

      if (attempt < maxRetries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }

      const rawMsg = err instanceof Error ? err.message : "Network failure";
      throw new AppError(502, sanitizeMessage(rawMsg, apiKey));
    }
  }

  throw new AppError(502, "Google API retries exhausted.");
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
