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

  it("fetches pollen forecast with X-Goog-Api-Key header and not in URL", async () => {
    const fakeResponse = {
      regionCode: "IN",
      dailyInfo: [
        {
          pollenTypeInfo: [{ code: "GRASS", indexInfo: { value: 3, category: "Moderate" } }],
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    const secretKey = "pollen-secret-key-123";
    const level = await getPollenForecast({ lat: 28.61, lng: 77.21, label: "Delhi" }, secretKey);

    expect(level).toBe("medium");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).not.toContain(secretKey);
    expect(calledUrl).not.toContain("key=");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe(secretKey);
  });
});
