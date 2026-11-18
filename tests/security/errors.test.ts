import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, toSafeError } from "@/lib/security/errors";

describe("Security Errors", () => {
  it("preserves AppError status and message", () => {
    const error = new AppError(404, "Requested resource not found.");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Requested resource not found.");
    expect(error.isSafe).toBe(true);

    const safe = toSafeError(error);
    expect(safe).toBe(error);
  });

  it("masks arbitrary internal Error messages and stack traces", () => {
    const internal = new Error("Database connection to postgres://admin:secret@db failed at line 42");
    const safe = toSafeError(internal);

    expect(safe.status).toBe(500);
    expect(safe.message).toBe("An internal error occurred. Please try again later.");
    expect(safe.message).not.toContain("postgres://");
    expect(safe.message).not.toContain("secret");
  });

  it("handles unknown or string throws safely", () => {
    const safe = toSafeError("random string thrown");
    expect(safe.status).toBe(500);
    expect(safe.message).toBe("An internal error occurred. Please try again later.");
  });

  it("transforms ZodError into a safe 400 Bad Request", () => {
    const testSchema = z.object({ value: z.number() });
    const parseResult = testSchema.safeParse({ value: "not a number" });
    if (!parseResult.success) {
      const safe = toSafeError(parseResult.error);
      expect(safe.status).toBe(400);
      expect(safe.message).toBe("Invalid request payload format.");
    }
  });
});
