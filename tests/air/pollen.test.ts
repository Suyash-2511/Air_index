import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractMaxPollenLevel, getPollenForecast, mapUpiToPollenLevel } from "@/lib/air/pollen";

describe("Pollen API & Mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps UPI values correctly to three-tier risk levels", () => {
    expect(mapUpiToPollenLevel(0)).toBe("low");
    expect(mapUpiToPollenLevel(1)).toBe("low");
    expect(mapUpiToPollenLevel(2)).toBe("low");
    expect(mapUpiToPollenLevel(3)).toBe("medium");
    expect(mapUpiToPollenLevel(4)).toBe("high");
    expect(mapUpiToPollenLevel(5)).toBe("high");
    expect(mapUpiToPollenLevel(undefined)).toBe("low");
  });

  it("extracts max pollen risk from multiple plant allergens", () => {
    const rawData = {
      dailyInfo: [
        {
          pollenTypeInfo: [
            { code: "GRASS", indexInfo: { value: 1 } },
            { code: "TREE", indexInfo: { value: 4 } },
            { code: "WEED", indexInfo: { value: 2 } },
          ],
        },
      ],
    };

    expect(extractMaxPollenLevel(rawData)).toBe("high");
  });

  it("handles empty or missing pollen data gracefully", () => {
    expect(extractMaxPollenLevel({})).toBe("low");
    expect(extractMaxPollenLevel({ dailyInfo: [] })).toBe("low");
  });

  it("fetches pollen forecast with stubbed fetch", async () => {
    const fakeResponse = {
      regionCode: "IN",
      dailyInfo: [
        {
          pollenTypeInfo: [
            { code: "GRASS", indexInfo: { value: 3, category: "Moderate" } },
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

    const level = await getPollenForecast(
      { lat: 28.61, lng: 77.21, label: "Delhi" },
      "test-pollen-key",
      { timeoutMs: 500, maxRetries: 0 },
    );

    expect(level).toBe("medium");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    expect(calledUrl).toContain("pollen.googleapis.com");
    expect(calledUrl).toContain("location.latitude=28.61");
  });

  it("retries pollen requests on 500 status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          dailyInfo: [{ pollenTypeInfo: [{ indexInfo: { value: 2 } }] }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const level = await getPollenForecast(
      { lat: 28.61, lng: 77.21, label: "Delhi" },
      "test-key",
      { timeoutMs: 500, maxRetries: 1, initialBackoffMs: 10 },
    );

    expect(level).toBe("low");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
