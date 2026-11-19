import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructured } from "@/lib/gemini/client";
import { AppError } from "@/lib/security/errors";

const testSchema = z.object({
  greeting: z.string(),
  count: z.number(),
});

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      };
    },
  };
});

describe("Gemini Client & generateStructured", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGenerateContent.mockReset();
    process.env = { ...origEnv };
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GOOGLE_MAPS_API_KEY = "test-maps-key";
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("uses demoFixture in demo mode and validates with Zod", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
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
    delete process.env.GOOGLE_MAPS_API_KEY;
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
    delete process.env.GEMINI_API_KEY;
    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
      }),
    ).rejects.toThrow(AppError);
  });

  it("successfully parses valid structured JSON response from Gemini API", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ greeting: "Namaste", count: 5 }),
    });

    const result = await generateStructured({
      system: "system",
      contents: "user",
      zodSchema: testSchema,
    });

    expect(result).toEqual({ greeting: "Namaste", count: 5 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("throws 502 when Gemini returns empty response", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "   " });

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
      }),
    ).rejects.toThrow(/Failed to generate structured response/);
  });

  it("throws 502 when Gemini output is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "not-json" });

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
      }),
    ).rejects.toThrow(/not valid JSON/);
  });

  it("throws 502 when Gemini output fails schema validation", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ wrong: "keys" }),
    });

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
      }),
    ).rejects.toThrow(/failed schema validation/);
  });

  it("retries on retryable 429 error and succeeds on second attempt", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED 429"))
      .mockResolvedValueOnce({
        text: JSON.stringify({ greeting: "Hi", count: 10 }),
      });

    const result = await generateStructured({
      system: "system",
      contents: "user",
      zodSchema: testSchema,
      maxRetries: 1,
    });

    expect(result).toEqual({ greeting: "Hi", count: 10 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("fails with 502 when retries are exhausted", async () => {
    mockGenerateContent.mockRejectedValue(new Error("503 Service UNAVAILABLE"));

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
        maxRetries: 1,
      }),
    ).rejects.toThrow(/Failed to generate structured response|retries exhausted/);
  });

  it("throws 504 on timeout", async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );

    await expect(
      generateStructured({
        system: "system",
        contents: "user",
        zodSchema: testSchema,
        timeoutMs: 50,
      }),
    ).rejects.toThrow(AppError);
  });
});
