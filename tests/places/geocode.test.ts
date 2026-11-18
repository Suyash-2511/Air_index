import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractShortLabel, reverseGeocode } from "@/lib/places/geocode";

describe("Geocoding API & Label Extraction", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("extracts short label combining sublocality and locality", () => {
    const components = [
      { long_name: "Connaught Place", short_name: "CP", types: ["sublocality", "political"] },
      { long_name: "New Delhi", short_name: "New Delhi", types: ["locality", "political"] },
      { long_name: "Delhi", short_name: "DL", types: ["administrative_area_level_1", "political"] },
    ];
    const fallback = "Connaught Place, New Delhi, Delhi 110001, India";

    const label = extractShortLabel(components, fallback);
    expect(label).toBe("Connaught Place, New Delhi");
  });

  it("falls back to city name when sublocality is absent", () => {
    const components = [
      { long_name: "Nashik", short_name: "Nashik", types: ["locality", "political"] },
      { long_name: "Maharashtra", short_name: "MH", types: ["administrative_area_level_1", "political"] },
    ];

    const label = extractShortLabel(components, "Nashik, Maharashtra, India");
    expect(label).toBe("Nashik");
  });

  it("returns demo reverse geocode when no API key is configured", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    // Near Delhi coordinates
    const res = await reverseGeocode(28.6139, 77.209);
    expect(res.label).toContain("New Delhi");
    expect(res.formattedAddress).toContain("Delhi");
    expect(res.lat).toBe(28.6139);
    expect(res.lng).toBe(77.209);
  });

  it("performs reverse geocoding with X-Goog-Api-Key header", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-geo-key";

    const fakeResponse = {
      status: "OK",
      results: [
        {
          formatted_address: "Bandra West, Mumbai, Maharashtra 400050, India",
          address_components: [
            { long_name: "Bandra West", short_name: "Bandra West", types: ["sublocality_level_1"] },
            { long_name: "Mumbai", short_name: "Mumbai", types: ["locality"] },
          ],
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await reverseGeocode(19.0596, 72.8295);
    expect(res.label).toBe("Bandra West, Mumbai");

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).toContain("maps/api/geocode/json?latlng=19.0596,72.8295");
    expect(calledUrl).not.toContain("key=");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-geo-key");
  });
});
