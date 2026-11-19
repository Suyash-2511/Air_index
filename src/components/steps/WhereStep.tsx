"use client";

import type { Location } from "@/lib/types";
import { useLocationSearch, DELHI_DEMO_LOCATION } from "@/hooks/useLocationSearch";
import { Combobox } from "../ui/Combobox";
import { IconArrowRight, IconCheck, IconLocation } from "../ui/icons";
import styles from "./WhereStep.module.css";

export { DELHI_DEMO_LOCATION };

/** Props for Step 1 location selector. */
export interface WhereStepProps {
  initialLocation?: Location | undefined;
  /** The visitor's live location, used as the default when they have not chosen another. */
  liveLocation?: Location | undefined;
  onLocationConfirmed: (location: Location, isDemo?: boolean | undefined) => void;
}

/**
 * Step 1: Where are you?
 * Captures the user's location via Places autocomplete, browser geolocation,
 * or the one-click New Delhi sample demo.
 */
export function WhereStep({ initialLocation, liveLocation, onLocationConfirmed }: WhereStepProps) {
  const {
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
  } = useLocationSearch({ initialLocation, liveLocation, onLocationConfirmed });

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
          onChange={handleQueryChange}
          onSelect={handleSelectSuggestion}
          suggestions={suggestions}
          loading={loading}
          placeholder="Try College Road, Nashik or Indiranagar, Bengaluru"
          error={error}
          noResultsFor={emptyFor === query ? emptyFor : undefined}
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
        disabled={!selectedLocation || loading}
        onClick={() => selectedLocation && onLocationConfirmed(selectedLocation)}
        className={styles.buttonPrimary}
      >
        <span>Continue to household</span>
        <IconArrowRight size={16} />
      </button>
    </section>
  );
}
