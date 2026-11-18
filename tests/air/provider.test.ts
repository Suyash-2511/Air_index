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

  it("returns realistic regional data from FixtureAirProvider", async () => {
    const provider = new FixtureAirProvider();
    const delhi = { lat: 28.61, lng: 77.21, label: "Delhi" };

    const current = await provider.current(delhi);
    expect(current.hour).toBeGreaterThanOrEqual(0);
    expect(current.hour).toBeLessThanOrEqual(23);
    expect(current.pm25).toBeGreaterThanOrEqual(150); // Delhi severe smog

    const forecast = await provider.forecast(delhi, 5);
    expect(forecast).toHaveLength(5);
    const firstForecast = forecast[0];
    expect(firstForecast?.pm25).toBeGreaterThan(0);
  });

  it("Google provider queries currentConditions and maps successfully", async () => {
    const fakeResponse = {
      dateTime: "2026-11-18T05:30:00Z",
      pollutants: [
        { code: "pm25", concentration: { value: 160.0, units: "MICROGRAMS_PER_CUBIC_METER" } },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleAirQualityProvider("test-key", { timeoutMs: 500, maxRetries: 0 });
    const location = { lat: 28.61, lng: 77.21, label: "Delhi" };

    const result = await provider.current(location);
    expect(result.pm25).toBe(160.0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;
    expect(calledUrl).toContain("currentConditions:lookup");
    expect(calledUrl).toContain("key=test-key");
    const sentBody = JSON.parse(String(calledInit?.body ?? "{}"));
    expect(sentBody.extraComputations).toContain("POLLUTANT_CONCENTRATION");
  });

  it("Google provider queries forecast:lookup with period and pageSize", async () => {
    const fakeResponse = {
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

    const provider = new GoogleAirQualityProvider("test-key", { timeoutMs: 500, maxRetries: 0 });
    const location = { lat: 28.61, lng: 77.21, label: "Delhi" };

    const result = await provider.forecast(location, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.pm25).toBe(140.0);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;
    expect(calledUrl).toContain("forecast:lookup");
    const sentBody = JSON.parse(String(calledInit?.body ?? "{}"));
    expect(sentBody.period?.startTime).toBeDefined();
    expect(sentBody.period?.endTime).toBeDefined();
  });

  it("Google provider retries on 429 and succeeds on subsequent attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Quota exceeded" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          dateTime: "2026-11-18T06:00:00Z",
          pollutants: [{ code: "pm25", concentration: { value: 120, units: "MICROGRAMS_PER_CUBIC_METER" } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleAirQualityProvider("test-key", {
      timeoutMs: 1000,
      maxRetries: 2,
      initialBackoffMs: 10,
    });
    const result = await provider.current({ lat: 28.61, lng: 77.21, label: "Delhi" });

    expect(result.pm25).toBe(120);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Google provider fails immediately on 400 without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid argument" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleAirQualityProvider("test-key", {
      timeoutMs: 1000,
      maxRetries: 2,
      initialBackoffMs: 10,
    });

    await expect(provider.current({ lat: 28.61, lng: 77.21, label: "Delhi" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never exposes API key in thrown error message", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleAirQualityProvider("super-secret-key-12345", {
      timeoutMs: 1000,
      maxRetries: 0,
    });

    try {
      await provider.current({ lat: 28.61, lng: 77.21, label: "Delhi" });
      expect.unreachable("Should have thrown");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain("super-secret-key-12345");
    }
  });
});
