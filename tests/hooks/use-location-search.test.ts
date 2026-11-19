// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as api from "@/client/api";
import { useLocationSearch } from "@/hooks/useLocationSearch";

describe("useLocationSearch", () => {
  it("initializes with initial location and handles sample household", () => {
    const onLocationConfirmed = vi.fn();
    const init = { lat: 28.6, lng: 77.2, label: "Delhi" };

    const { result } = renderHook(() =>
      useLocationSearch({
        initialLocation: init,
        onLocationConfirmed,
      }),
    );

    expect(result.current.query).toBe("Delhi");
    expect(result.current.selectedLocation).toEqual(init);

    act(() => {
      result.current.handleSampleHousehold();
    });
    expect(onLocationConfirmed).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it("handles query changes, suggestions, and selecting a place", async () => {
    const onLocationConfirmed = vi.fn();
    vi.spyOn(api, "fetchPlaceSuggestions").mockResolvedValueOnce([
      { placeId: "p1", mainText: "Indiranagar", secondaryText: "Bengaluru" },
    ]);
    vi.spyOn(api, "fetchPlaceLocation").mockResolvedValueOnce({
      lat: 12.97,
      lng: 77.59,
      label: "Indiranagar, Bengaluru",
    });

    const { result } = renderHook(() =>
      useLocationSearch({ onLocationConfirmed }),
    );

    act(() => {
      result.current.handleQueryChange("Indiranagar");
    });
    expect(result.current.query).toBe("Indiranagar");

    // Wait for debounce
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(result.current.suggestions.length).toBe(1);

    await act(async () => {
      await result.current.handleSelectSuggestion(result.current.suggestions[0]!);
    });
    expect(result.current.selectedLocation?.label).toBe("Indiranagar, Bengaluru");
  });
});
