import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FixtureAirProvider, getAirProvider, GoogleAirQualityProvider } from "@/lib/air";

describe("Air Quality Providers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("selects FixtureAirProvider when no API key is configured", () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const provider = getAirProvider();
    expect(provider).toBeInstanceOf(FixtureAirProvider);
  });

  it("selects GoogleAirQualityProvider when API key is present", () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-secret-key";
    const provider = getAirProvider();
    expect(provider).toBeInstanceOf(GoogleAirQualityProvider);
  });

  it("sends API key in X-Goog-Api-Key header and NEVER in the request URL", async () => {
    const fakeResponse = {
      regionCode: "in",
      dateTime: "2026-11-18T05:30:00Z",
      pollutants: [{ code: "pm25", concentration: { value: 160.0, units: "MICROGRAMS_PER_CUBIC_METER" } }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const secretKey = "test-secret-key-999";
    const provider = new GoogleAirQualityProvider(secretKey);
    const location = { lat: 28.61, lng: 77.21, label: "Delhi" };

    const result = await provider.current(location);
    expect(result.pm25).toBe(160.0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    // Verify key is in header
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe(secretKey);

    // Verify key NEVER appears in URL
    expect(calledUrl).not.toContain(secretKey);
    expect(calledUrl).not.toContain("key=");
  });

  it("queries forecast:lookup with period and sends X-Goog-Api-Key header", async () => {
    const fakeResponse = {
      regionCode: "in",
      hourlyForecasts: [
        {
          dateTime: "2026-11-18T07:00:00Z",
          pollutants: [{ code: "pm25", concentration: { value: 140.0, units: "MICROGRAMS_PER_CUBIC_METER" } }],
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const secretKey = "test-forecast-key";
    const provider = new GoogleAirQualityProvider(secretKey);
    const location = { lat: 28.61, lng: 77.21, label: "Delhi" };

    const result = await provider.forecast(location, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.pm25).toBe(140.0);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).not.toContain("key=");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe(secretKey);
  });
});
