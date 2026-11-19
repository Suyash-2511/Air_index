import { afterEach, describe, expect, it, vi } from "vitest";
import { askPlanQuestion, fetchPlaceLocation, fetchPlaceSuggestions, fetchReverseGeocode } from "@/client/api";

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("client contract with the location routes", () => {
  it("posts the search to /api/places and maps predictions", async () => {
    const fn = mockFetch({ predictions: [{ placeId: "p1", primaryText: "Nashik", secondaryText: "Maharashtra" }] });
    const result = await fetchPlaceSuggestions("Nashik", "tok");
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/places");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ input: "Nashik", sessionToken: "tok" });
    expect(result).toEqual([{ placeId: "p1", mainText: "Nashik", secondaryText: "Maharashtra" }]);
  });

  it("surfaces the server's error message", async () => {
    mockFetch({ error: "Search query must be between 2 and 100 characters." }, 400);
    await expect(fetchPlaceSuggestions("N", "tok")).rejects.toThrow(/between 2 and 100/);
  });

  it("reads the place wrapper from /api/places/:id", async () => {
    const fn = mockFetch({ place: { placeId: "p1", label: "Nashik", lat: 20.0, lng: 73.79, formattedAddress: "x" } });
    const loc = await fetchPlaceLocation("p1", "tok");
    expect(fn.mock.calls[0]?.[0]).toBe("/api/places/p1?sessionToken=tok");
    expect(loc).toEqual({ label: "Nashik", lat: 20.0, lng: 73.79 });
  });

  it("posts coordinates to /api/geocode and reads the location wrapper", async () => {
    const fn = mockFetch({ location: { label: "Nashik", formattedAddress: "x", lat: 20, lng: 73.8 } });
    const loc = await fetchReverseGeocode(20, 73.8);
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/geocode");
    expect(init.method).toBe("POST");
    expect(loc).toEqual({ label: "Nashik", lat: 20, lng: 73.8 });
  });

  it("returns an empty citations list when the answer has none", async () => {
    mockFetch({ answer: "Yes.", answerable: true, citedInterventionIds: ["mask_outdoors"] });
    const res = await askPlanQuestion("Mask?", {} as never);
    expect(res.citations).toEqual([]);
    expect(res.answer).toBe("Yes.");
  });
});

