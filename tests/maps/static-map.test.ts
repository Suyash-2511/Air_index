import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStaticMapUrl, getStaticMap } from "@/lib/maps/static-map";
import { AppError } from "@/lib/security/errors";

describe("static-map", () => {
  const secretKey = "AIzaSyTestSecretStaticMapKey999";

  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds static map URL with center, zoom, size, scale, format, key, and style params", () => {
    const url = buildStaticMapUrl(28.6139, 77.209, secretKey);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://maps.googleapis.com/maps/api/staticmap");
    expect(parsed.searchParams.get("center")).toBe("28.61,77.21");
    expect(parsed.searchParams.get("zoom")).toBe("12");
    expect(parsed.searchParams.get("size")).toBe("640x360");
    expect(parsed.searchParams.get("scale")).toBe("2");
    expect(parsed.searchParams.get("format")).toBe("png");
    expect(parsed.searchParams.get("key")).toBe(secretKey);

    const styles = parsed.searchParams.getAll("style");
    expect(styles.length).toBeGreaterThan(0);
    expect(styles.some((s) => s.includes("feature:landscape"))).toBe(true);
  });

  it("throws a 404 AppError in demo mode when no key is set", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");

    await expect(getStaticMap(28.61, 77.21)).rejects.toThrowError(AppError);
    await expect(getStaticMap(28.61, 77.21)).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining("Map preview is available"),
    });
  });

  it("never leaks the API key in thrown error messages when Google call fails", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", secretKey);

    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(`Error near ${secretKey}: Service Unavailable`, {
          status: 503,
          statusText: "Service Unavailable",
        }),
      ),
    );

    try {
      await getStaticMap(12.34, 56.78);
      expect.fail("Expected getStaticMap to throw");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain(secretKey);
    }
  });
});
