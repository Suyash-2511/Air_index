"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { fetchPlaceLocation, fetchPlaceSuggestions } from "@/client/api";
import type { PlaceSuggestion } from "@/client/types";
import { DELHI_DEMO_LOCATION } from "@/data/locations";
import type { Location } from "@/lib/types";
import { useBrowserLocation } from "./useBrowserLocation";

export { DELHI_DEMO_LOCATION };

/** Wait this long after the last keystroke before asking Places, so a word is one request and not one per letter. */
const SEARCH_DEBOUNCE_MS = 250;

function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Options for the location search hook. */
interface UseLocationSearchOptions {
  initialLocation?: Location | undefined;
  liveLocation?: Location | undefined;
  onLocationConfirmed: (location: Location, isDemo?: boolean | undefined) => void;
}

/** State and handlers returned by useLocationSearch. */
interface UseLocationSearchResult {
  query: string;
  selectedLocation: Location | undefined;
  suggestions: readonly PlaceSuggestion[];
  isLoading: boolean;
  error: string | undefined;
  emptyFor: string | undefined;
  isLive: boolean;
  isLocating: boolean;
  handleQueryChange: (value: string) => void;
  handleSelectSuggestion: (suggestion: PlaceSuggestion) => Promise<void>;
  handleUseMyLocation: () => void;
  handleSampleHousehold: () => void;
}

/** Where the suggestion search reports that it is busy or has failed. */
interface SearchStatus {
  setIsLoading: (isLoading: boolean) => void;
  setError: (message: string | undefined) => void;
}

interface SuggestionSearchInput {
  query: string;
  selectedLocation: Location | undefined;
  sessionToken: MutableRefObject<string>;
  status: SearchStatus;
}

/** Looks up suggestions for the typed text once typing pauses, and says which text found nothing. */
function useSuggestionSearch({ query, selectedLocation, sessionToken, status }: SuggestionSearchInput) {
  const [suggestions, setSuggestions] = useState<readonly PlaceSuggestion[]>([]);
  const [emptyFor, setEmptyFor] = useState<string | undefined>();
  const { setIsLoading, setError } = status;

  useEffect(() => {
    const isAlreadyChosen = selectedLocation !== undefined && query === selectedLocation.label;
    if (!query.trim() || isAlreadyChosen) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const results = await fetchPlaceSuggestions(query, sessionToken.current);
        setSuggestions(results);
        setEmptyFor(results.length === 0 ? query : undefined);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, selectedLocation, sessionToken, setIsLoading, setError]);

  return { suggestions, emptyFor, clearSuggestions: () => setSuggestions([]) };
}

/** Fetches the full place for a chosen suggestion and starts a fresh search session; undefined when it fails. */
async function resolvePick(suggestion: PlaceSuggestion, sessionToken: MutableRefObject<string>, status: SearchStatus): Promise<Location | undefined> {
  status.setIsLoading(true);
  status.setError(undefined);
  try {
    const picked = await fetchPlaceLocation(suggestion.placeId, sessionToken.current);
    sessionToken.current = generateSessionToken();
    return picked;
  } catch (err: unknown) {
    status.setError(err instanceof Error ? err.message : "Could not resolve selected place");
    return undefined;
  } finally {
    status.setIsLoading(false);
  }
}

/** The text in the box and the place it stands for, with whether that place came from the visitor's own position. */
function useSelectedPlace(initialLocation: Location | undefined, liveLocation: Location | undefined) {
  const [query, setQuery] = useState(initialLocation?.label ?? "");
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(initialLocation);
  const [isLive, setIsLive] = useState(false);
  // Once the visitor picks a place themselves, a late live-location fix must not replace it.
  const hasChosenOtherRef = useRef(false);

  const applyLive = (live: Location) => {
    setSelectedLocation(live);
    setQuery(live.label);
    setIsLive(true);
  };

  /** Takes a live position as the selection unless the visitor already chose; says whether it did. */
  const applyUnlessChosen = (live: Location): boolean => {
    if (hasChosenOtherRef.current) return false;
    applyLive(live);
    return true;
  };

  useEffect(() => {
    if (liveLocation && !initialLocation) applyUnlessChosen(liveLocation);
  }, [liveLocation, initialLocation]);

  const choose = (location: Location | undefined) => {
    hasChosenOtherRef.current = true;
    setIsLive(false);
    setSelectedLocation(location);
  };

  return { query, setQuery, selectedLocation, isLive, hasChosenOtherRef, applyUnlessChosen, choose };
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
  const place = useSelectedPlace(initialLocation, liveLocation);
  const { query, setQuery, selectedLocation, hasChosenOtherRef, choose } = place;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Places bills a search session as one unit; the token is renewed after each pick.
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const { suggestions, emptyFor, clearSuggestions } = useSuggestionSearch({
    query,
    selectedLocation,
    sessionToken: sessionTokenRef,
    status: { setIsLoading, setError },
  });

  const { locate, geoLoading } = useBrowserLocation({
    initialLocation: initialLocation ?? liveLocation,
    onLocationResolved: (resolved) => place.applyUnlessChosen(resolved) && clearSuggestions(),
    onError: setError,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selectedLocation && value !== selectedLocation.label) choose(undefined);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    const picked = await resolvePick(suggestion, sessionTokenRef, { setIsLoading, setError });
    if (!picked) return;
    choose(picked);
    setQuery(picked.label);
    clearSuggestions();
  };

  const handleUseMyLocation = () => {
    setError(undefined);
    hasChosenOtherRef.current = false;
    locate(false);
  };

  const handleSampleHousehold = () => {
    choose(DELHI_DEMO_LOCATION);
    setQuery(DELHI_DEMO_LOCATION.label);
    onLocationConfirmed(DELHI_DEMO_LOCATION, true);
  };

  return {
    query,
    selectedLocation,
    suggestions,
    isLoading,
    error,
    emptyFor,
    isLive: place.isLive,
    isLocating: geoLoading,
    handleQueryChange,
    handleSelectSuggestion,
    handleUseMyLocation,
    handleSampleHousehold,
  };
}
