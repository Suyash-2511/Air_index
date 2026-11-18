"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchPlaceLocation,
  fetchPlaceSuggestions,
  fetchReverseGeocode,
} from "@/client/api";
import type { PlaceSuggestion } from "@/client/types";
import type { Location } from "@/lib/types";
import { Combobox } from "./Combobox";
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
export function WhereStep({
  initialLocation,
  onLocationConfirmed,
}: WhereStepProps) {
  const [query, setQuery] = useState(initialLocation?.label ?? "");
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(initialLocation);
  const [suggestions, setSuggestions] = useState<readonly PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const sessionTokenRef = useRef<string>(generateSessionToken());

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
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    setError(undefined);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await fetchReverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setSelectedLocation(loc);
          setQuery(loc.label);
          setSuggestions([]);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Could not identify your address");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setError(`Location access denied: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSampleHousehold = () => {
    setSelectedLocation(DELHI_DEMO_LOCATION);
    setQuery(DELHI_DEMO_LOCATION.label);
    onLocationConfirmed(DELHI_DEMO_LOCATION, true);
  };

  return (
    <section className={styles.stepContainer} aria-labelledby="step-where-heading">
      <h2 id="step-where-heading" className={styles.heading} tabIndex={-1}>
        Where are you?
      </h2>
      <p className={styles.description}>
        Saans pulls hourly air-quality readings and forecasts across India to calculate
        your family's exact exposure throughout the day.
      </p>

      <div className={styles.searchSection}>
        <span className={styles.label}>City, Neighborhood or PIN</span>
        <Combobox
          label="Search location in India"
          value={query}
          onChange={(val) => {
            setQuery(val);
            if (selectedLocation && val !== selectedLocation.label) {
              setSelectedLocation(undefined);
            }
          }}
          onSelect={handleSelectSuggestion}
          suggestions={suggestions}
          loading={loading}
          placeholder="e.g. Lajpat Nagar, Delhi or Indiranagar, Bengaluru"
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
          {geoLoading ? "Locating..." : "Use my location"}
        </button>

        <button
          type="button"
          onClick={handleSampleHousehold}
          className={styles.buttonSecondary}
        >
          Try a sample household (Delhi)
        </button>
      </div>

      {selectedLocation && (
        <div className={styles.selectedBadge} role="status">
          <span className={styles.label}>Selected:</span>
          <span className={styles.selectedLabel}>{selectedLocation.label}</span>
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
        Continue to Household
      </button>
    </section>
  );
}
