"use client";

import type { Location } from "@/lib/types";
import { useLocale } from "@/hooks/useLocale";
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
  const { t } = useLocale();
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
      <p className={styles.kicker}>{t("where_kicker")}</p>
      <h2 id="step-where-heading" className={styles.heading} tabIndex={-1}>
        {t("where_heading")}
      </h2>
      <p className={styles.description}>
        {t("where_description")}
      </p>

      <div className={styles.searchSection}>
        <span className={styles.label} aria-hidden="true">{t("where_search_label")}</span>
        <Combobox
          label={t("where_combobox_label")}
          value={query}
          onChange={handleQueryChange}
          onSelect={handleSelectSuggestion}
          suggestions={suggestions}
          loading={loading}
          placeholder={t("where_placeholder")}
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
          {geoLoading ? t("where_finding_you") : t("where_use_my_location")}
        </button>

        <button
          type="button"
          onClick={handleSampleHousehold}
          className={styles.buttonLink}
        >
          {t("where_sample_household")}
        </button>
      </div>

      {selectedLocation && (
        <div className={styles.selectedBadge} role="status">
          <span className={styles.selectedIcon} aria-hidden="true"><IconCheck size={14} /></span>
          <span>
            <span className={styles.selectedHint}>{isLive ? t("where_planning_live") : t("where_planning_for")}</span>
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
        <span>{t("where_continue")}</span>
        <IconArrowRight size={16} />
      </button>
    </section>
  );
}
