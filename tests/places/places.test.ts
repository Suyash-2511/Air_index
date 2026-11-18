import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAutocomplete, fetchPlaceDetails, PLACE_DETAILS_FIELD_MASK } from "@/lib/places/autocomplete";

describe("Places Autocomplete & Details", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects search inputs shorter than 2 or longer than 100 characters", async () => {
    await expect(fetchAutocomplete("a")).rejects.toThrow(/between 2 and 100/i);
    await expect(fetchAutocomplete(" ".repeat(5))).rejects.toThrow(/between 2 and 100/i);
    await expect(fetchAutocomplete("x".repeat(101))).rejects.toThrow(/between 2 and 100/i);
  });

  it("returns demo fixture predictions when no API key is configured", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const results = await fetchAutocomplete("Connaught");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.primaryText).toBe("Connaught Place");
    expect(results[0]?.placeId).toContain("fixture-");
  });

  it("sends sessionToken, includedRegionCodes ['in'], and X-Goog-Api-Key to autocomplete", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-places-key";

    const fakeResponse = {
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJ12345",
            structuredFormat: {
              mainText: { text: "Connaught Place" },
              secondaryText: { text: "New Delhi, Delhi, India" },
            },
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const sessionToken = "session-uuid-123";
    const results = await fetchAutocomplete("Connaught", sessionToken);

    expect(results).toHaveLength(1);
    expect(results[0]?.placeId).toBe("ChIJ12345");
    expect(results[0]?.primaryText).toBe("Connaught Place");
    expect(results[0]?.secondaryText).toBe("New Delhi, Delhi, India");

    const firstCall = fetchMock.mock.calls[0];
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;
    const body = JSON.parse(String(calledInit?.body ?? "{}"));

    expect(body.input).toBe("Connaught");
    expect(body.includedRegionCodes).toEqual(["in"]);
    expect(body.sessionToken).toBe(sessionToken);

    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-places-key");
  });

  it("sends X-Goog-FieldMask with location,displayName,formattedAddress for Place Details", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-places-key";

    const fakeDetails = {
      id: "ChIJ12345",
      displayName: { text: "Connaught Place" },
      formattedAddress: "Connaught Place, New Delhi, Delhi 110001, India",
      location: { latitude: 28.6315, longitude: 77.2167 },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeDetails,
    });
    vi.stubGlobal("fetch", fetchMock);

    const details = await fetchPlaceDetails("ChIJ12345", "session-uuid-123");
    expect(details.placeId).toBe("ChIJ12345");
    expect(details.lat).toBe(28.6315);
    expect(details.lng).toBe(77.2167);
    expect(details.label).toBe("Connaught Place");

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).toContain("places/ChIJ12345");
    expect(calledUrl).toContain("sessionToken=session-uuid-123");

    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toBe(PLACE_DETAILS_FIELD_MASK);
  });
});
