"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPlaceLocation, fetchPlaceSuggestions } from "@/client/api";
import type { PlaceSuggestion } from "@/client/types";
import type { Location } from "@/lib/types";
import { Combobox } from "./Combobox";
import { IconArrowRight, IconCheck, IconLocation } from "./icons";
import { useBrowserLocation } from "./useBrowserLocation";
import styles from "./WhereStep.module.css";

/** Default New Delhi demo coordinates. */
export const DELHI_DEMO_LOCATION: Location = {
  lat: 28.6139,
  lng: 77.209,
  label: "Connaught Place, New Delhi, Delhi",
};

/** Props for Step 1 location selector. */
export interface WhereStepProps {
  initialLocation?: Location | undefined;
  /** The visitor's live location, used as the default when they have not chosen another. */
  liveLocation?: Location | undefined;
  onLocationConfirmed: (location: Location, isDemo?: boolean | undefined) => void;
}

function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Step 1: Where are you?
 * Captures the user's location via Places autocomplete, browser geolocation,
 * or the one-click New Delhi sample demo.
 */
export function WhereStep({ initialLocation, liveLocation, onLocationConfirmed }: WhereStepProps) {
  const [query, setQuery] = useState(initialLocation?.label ?? "");
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(initialLocation);
  const [suggestions, setSuggestions] = useState<readonly PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isLive, setIsLive] = useState(false);
  // Once the visitor types or picks another place, live location must not overwrite it.
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

  // Live location is the default; it fills in once known unless another place was chosen.
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedLocation]);

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

  return (
    <section className={styles.stepContainer} aria-labelledby="step-where-heading">
      <p className={styles.kicker}>Entry 01 · Area</p>
      <h2 id="step-where-heading" className={styles.heading} tabIndex={-1}>
        Where are you?
      </h2>
      <p className={styles.description}>
        Saans starts from your live location. Search to plan for any other
        area, such as a relative's home or your workplace.
      </p>

      <div className={styles.searchSection}>
        <span className={styles.label} aria-hidden="true">City, neighbourhood or PIN code</span>
        <Combobox
          label="Search location in India"
          value={query}
          onChange={(val) => {
            setQuery(val);
            if (selectedLocation && val !== selectedLocation.label) {
              choseOtherRef.current = true;
              setIsLive(false);
              setSelectedLocation(undefined);
            }
          }}
          onSelect={handleSelectSuggestion}
          suggestions={suggestions}
          loading={loading}
          placeholder="Try College Road, Nashik or Indiranagar, Bengaluru"
          error={error}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLoading || loading}
          className={styles.buttonSecondary}
        >
          <IconLocation size={16} />
          {geoLoading ? "Finding you…" : "Use my location"}
        </button>

        <button
          type="button"
          onClick={handleSampleHousehold}
          className={styles.buttonLink}
        >
          Try a sample household (Delhi)
        </button>
      </div>

      {selectedLocation && (
        <div className={styles.selectedBadge} role="status">
          <span className={styles.selectedIcon} aria-hidden="true"><IconCheck size={14} /></span>
          <span>
            <span className={styles.selectedHint}>{isLive ? "Planning for · your live location" : "Planning for"}</span>
            <span className={styles.selectedLabel}>{selectedLocation.label}</span>
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!selectedLocation || loading || geoLoading}
        onClick={() => {
          if (selectedLocation) onLocationConfirmed(selectedLocation);
        }}
        className={styles.buttonPrimary}
      >
        Continue to household
        <IconArrowRight size={16} />
      </button>
    </section>
  );
}
