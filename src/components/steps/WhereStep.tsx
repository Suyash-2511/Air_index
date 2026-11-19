"use client";

import type { Location } from "@/lib/types";
import { useLocale } from "@/hooks";
import { useLocationSearch, DELHI_DEMO_LOCATION } from "@/hooks";
import { Combobox } from "../ui";
import { IconArrowRight, IconCheck, IconLocation } from "../ui";
import styles from "./WhereStep.module.css";

export { DELHI_DEMO_LOCATION };

/** Props for Step 1 location selector. */
interface WhereStepProps {
  initialLocation?: Location | undefined;
  /** The visitor's live location, used as the default when they have not chosen another. */
  liveLocation?: Location | undefined;
  onLocationConfirmed: (location: Location, isDemo?: boolean | undefined) => void;
}

interface LocationActionsProps {
  isBusy: boolean;
  isLocating: boolean;
  onLocate: () => void;
  onSample: () => void;
}

/** The two shortcuts past typing: use this device's position, or load the New Delhi sample family. */
function LocationActions({ isBusy, isLocating, onLocate, onSample }: LocationActionsProps) {
  const { t } = useLocale();
  return (
    <div className={styles.actions}>
      <button type="button" onClick={onLocate} disabled={isBusy} className={styles.buttonSecondary}>
        <IconLocation size={16} />
        {isLocating ? t("where_finding_you") : t("where_use_my_location")}
      </button>
      <button type="button" onClick={onSample} className={styles.buttonLink}>
        {t("where_sample_household")}
      </button>
    </div>
  );
}

/** Confirms which place the plan will be for, and whether it came from the visitor's own position. */
function SelectedBadge({ label, isLive }: { label: string; isLive: boolean }) {
  const { t } = useLocale();
  return (
    <div className={styles.selectedBadge} role="status">
      <span className={styles.selectedIcon} aria-hidden="true"><IconCheck size={14} /></span>
      <span>
        <span className={styles.selectedHint}>{isLive ? t("where_planning_live") : t("where_planning_for")}</span>
        <span className={styles.selectedLabel}>{label}</span>
      </span>
    </div>
  );
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
    isLoading,
    error,
    emptyFor,
    isLive,
    isLocating,
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
          isLoading={isLoading}
          placeholder={t("where_placeholder")}
          error={error}
          noResultsFor={emptyFor === query ? emptyFor : undefined}
        />
      </div>

      <LocationActions isBusy={isLocating || isLoading} isLocating={isLocating} onLocate={handleUseMyLocation} onSample={handleSampleHousehold} />

      {selectedLocation && <SelectedBadge label={selectedLocation.label} isLive={isLive} />}

      <button
        type="button"
        disabled={!selectedLocation || isLoading}
        onClick={() => selectedLocation && onLocationConfirmed(selectedLocation)}
        className={styles.buttonPrimary}
      >
        <span>{t("where_continue")}</span>
        <IconArrowRight size={16} />
      </button>
    </section>
  );
}
