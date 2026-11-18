import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructured } from "@/lib/gemini/client";
import { AppError } from "@/lib/security/errors";

const testSchema = z.object({
  greeting: z.string(),
  count: z.number(),
});

describe("Gemini Client & generateStructured", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses demoFixture in demo mode and validates with Zod", async () => {
    const fixture = () => ({ greeting: "hello", count: 42 });
    const result = await generateStructured({
      system: "system instructions",
      contents: "user input",
      zodSchema: testSchema,
      demoFixture: fixture,
    });

    expect(result).toEqual({ greeting: "hello", count: 42 });
  });

  it("rejects demoFixture if it fails Zod schema validation", async () => {
    const badFixture = () =>
      ({ greeting: 123 as unknown as string, count: "not-a-number" as unknown as number });

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
        demoFixture: badFixture,
      }),
    ).rejects.toThrow();
  });

  it("throws AppError(500) if no key and no demo fixture provided", async () => {
    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
      }),
    ).rejects.toThrow(AppError);
  });
});
