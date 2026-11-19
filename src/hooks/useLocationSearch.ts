"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPlaceLocation, fetchPlaceSuggestions } from "@/client/api";
import type { PlaceSuggestion } from "@/client/types";
import type { Location } from "@/lib/types";
import { useBrowserLocation } from "./useBrowserLocation";

/** Default New Delhi demo coordinates. */
export const DELHI_DEMO_LOCATION: Location = {
  lat: 28.6139,
  lng: 77.209,
  label: "Connaught Place, New Delhi, Delhi",
};

function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Options for the location search hook. */
export interface UseLocationSearchOptions {
  initialLocation?: Location | undefined;
  liveLocation?: Location | undefined;
  onLocationConfirmed: (location: Location, isDemo?: boolean | undefined) => void;
}

/** State and handlers returned by useLocationSearch. */
export interface UseLocationSearchResult {
  query: string;
  selectedLocation: Location | undefined;
  suggestions: readonly PlaceSuggestion[];
  loading: boolean;
  error: string | undefined;
  emptyFor: string | undefined;
  isLive: boolean;
  geoLoading: boolean;
  handleQueryChange: (val: string) => void;
  handleSelectSuggestion: (suggestion: PlaceSuggestion) => Promise<void>;
  handleUseMyLocation: () => void;
  handleSampleHousehold: () => void;
}

/**
 * Manages Places autocomplete search, browser geolocation, session tokens,
 * and location selection state for the location step.
 */
export function useLocationSearch({
  initialLocation,
  liveLocation,
  onLocationConfirmed,
}: UseLocationSearchOptions): UseLocationSearchResult {
  const [query, setQuery] = useState(initialLocation?.label ?? "");
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(initialLocation);
  const [suggestions, setSuggestions] = useState<readonly PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [emptyFor, setEmptyFor] = useState<string | undefined>();
  const [isLive, setIsLive] = useState(false);
  const choseOtherRef = useRef(false);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const { locate, geoLoading } = useBrowserLocation({
    initialLocation: initialLocation ?? liveLocation,
    onLocationResolved: (loc) => {
      if (choseOtherRef.current) return;
      setSelectedLocation(loc);
      setQuery(loc.label);
      setSuggestions([]);
      setIsLive(true);
    },
    onError: (msg) => setError(msg),
  });

  useEffect(() => {
    if (!liveLocation || initialLocation || choseOtherRef.current) return;
    setSelectedLocation(liveLocation);
    setQuery(liveLocation.label);
    setIsLive(true);
  }, [liveLocation, initialLocation]);

  useEffect(() => {
    if (!query.trim() || (selectedLocation && query === selectedLocation.label)) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const results = await fetchPlaceSuggestions(query, sessionTokenRef.current);
        setSuggestions(results);
        setEmptyFor(results.length === 0 ? query : undefined);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedLocation]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (selectedLocation && val !== selectedLocation.label) {
      choseOtherRef.current = true;
      setIsLive(false);
      setSelectedLocation(undefined);
    }
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    setError(undefined);
    try {
      const loc = await fetchPlaceLocation(suggestion.placeId, sessionTokenRef.current);
      sessionTokenRef.current = generateSessionToken();
      choseOtherRef.current = true;
      setIsLive(false);
      setSelectedLocation(loc);
      setQuery(loc.label);
      setSuggestions([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resolve selected place");
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    setError(undefined);
    choseOtherRef.current = false;
    locate(false);
  };

  const handleSampleHousehold = () => {
    choseOtherRef.current = true;
    setIsLive(false);
    setSelectedLocation(DELHI_DEMO_LOCATION);
    setQuery(DELHI_DEMO_LOCATION.label);
    onLocationConfirmed(DELHI_DEMO_LOCATION, true);
  };

  return {
    query,
    selectedLocation,
    suggestions,
    loading,
    error,
    emptyFor,
    isLive,
    geoLoading,
    handleQueryChange,
    handleSelectSuggestion,
    handleUseMyLocation,
    handleSampleHousehold,
  };
}
