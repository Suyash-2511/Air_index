"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReverseGeocode } from "@/client/api";
import type { Location } from "@/lib/types";

/** Options for configuring browser geolocation tracking. */
interface UseBrowserLocationOptions {
  initialLocation?: Location | undefined;
  onLocationResolved: (location: Location) => void;
  onError?: (message: string) => void;
}

/** Return signature for the browser location hook. */
interface UseBrowserLocationReturn {
  locate: (silent: boolean) => void;
  geoLoading: boolean;
}

/**
 * Handles HTML5 browser geolocation with automatic silent resolution on arrival
 * and friendly error messages that guide users to search when blocked or insecure.
 */
export function useBrowserLocation({
  initialLocation,
  onLocationResolved,
  onError,
}: UseBrowserLocationOptions): UseBrowserLocationReturn {
  const [geoLoading, setGeoLoading] = useState(false);

  const locate = useCallback(
    (silent: boolean) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        if (!silent) onError?.("This browser can't share location. Search for your area instead.");
        return;
      }
      if (!window.isSecureContext) {
        if (!silent) onError?.("Location sharing only works on a secure (https) page. Search for your area instead.");
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const loc = await fetchReverseGeocode(pos.coords.latitude, pos.coords.longitude);
            onLocationResolved(loc);
          } catch (err: unknown) {
            if (!silent) onError?.(err instanceof Error ? err.message : "Could not name your area. Search for it instead.");
          } finally {
            setGeoLoading(false);
          }
        },
        (err) => {
          setGeoLoading(false);
          if (silent) return;
          onError?.(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked for this site. Allow it in the address bar, or search for your area."
              : "Couldn't find your location just now. Search for your area instead.",
          );
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 10 * 60 * 1000 },
      );
    },
    [onLocationResolved, onError],
  );

  useEffect(() => {
    if (initialLocation || typeof window === "undefined" || !window.isSecureContext) return;
    const permissions = navigator.permissions;
    if (!permissions?.query) {
      locate(true);
      return;
    }
    permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "denied") locate(true);
      })
      .catch(() => locate(true));
  }, [initialLocation, locate]);

  return { locate, geoLoading };
}
