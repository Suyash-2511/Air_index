// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBrowserLocation } from "@/hooks";

describe("useBrowserLocation", () => {
  beforeEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      writable: true,
      value: true,
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      writable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("insecure context gives the https message on manual locate and nothing when silent", () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      writable: true,
      value: false,
    });

    const onError = vi.fn();
    const onLocationResolved = vi.fn();

    const { result } = renderHook(() =>
      useBrowserLocation({
        onLocationResolved,
        onError,
      }),
    );

    // Silent locate on insecure context: must stay silent
    act(() => {
      result.current.locate(true);
    });
    expect(onError).not.toHaveBeenCalled();

    // Manual locate on insecure context: friendly https message
    act(() => {
      result.current.locate(false);
    });
    expect(onError).toHaveBeenCalledWith(
      "Location sharing only works on a secure (https) page. Search for your area instead.",
    );
  });

  it("permission denied gives the blocked message on manual locate", () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((_success, error) => {
      error({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "User denied Geolocation",
      });
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      writable: true,
      value: { getCurrentPosition: mockGetCurrentPosition },
    });

    const onError = vi.fn();
    const onLocationResolved = vi.fn();

    const { result } = renderHook(() =>
      useBrowserLocation({
        onLocationResolved,
        onError,
      }),
    );

    act(() => {
      result.current.locate(false);
    });

    expect(onError).toHaveBeenCalledWith(
      "Location is blocked for this site. Allow it in the address bar, or search for your area.",
    );
  });
});
