import { HTTP_STATUS } from "./http-status";

/**
 * User-safe application error containing an HTTP status code and sanitized message.
 * Internal technical details, provider payloads, and stack traces are excluded.
 */
export class AppError extends Error {
  readonly status: number;
  readonly isSafe = true;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Normalizes any error into a safe AppError instance.
 * Ensures external API responses, secrets, or stack traces never reach the client.
 */
export function toSafeError(error: unknown): AppError {
  if (error instanceof AppError && error.isSafe) {
    return error;
  }
  if (typeof error === "object" && error !== null && "name" in error && error.name === "ZodError") {
    return new AppError(HTTP_STATUS.BAD_REQUEST, "Invalid request payload format.");
  }
  return new AppError(HTTP_STATUS.INTERNAL_ERROR, "An internal error occurred. Please try again later.");
}
