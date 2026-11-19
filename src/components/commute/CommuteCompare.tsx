"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "@/hooks";
import { type CommuteModeComparison, compareCommuteModes, DEFAULT_COMMUTE_KM, MAX_COMMUTE_KM } from "@/lib/commute";
import type { AgeBand } from "@/lib/types";
import styles from "./CommuteCompare.module.css";
import { CommuteModeRow } from "./CommuteModeRow";

/** The input does not offer less than a kilometre. */
const MIN_DISTANCE_KM = 1;

const COLUMN_HEADINGS = ["commute_th_mode", "commute_th_duration", "commute_th_dose", "commute_th_co2", "commute_th_action"] as const;

interface DistanceFieldProps {
  value: number;
  onChange: (km: number) => void;
}

/** The one-way trip length the comparison is worked out for. */
function DistanceField({ value, onChange }: DistanceFieldProps) {
  const { t } = useLocale();
  const inputId = useId();
  return (
    <div className={styles.controls}>
      <div className={styles.distanceField}>
        <label htmlFor={inputId} className={styles.label}>
          {t("commute_distance_label")}
        </label>
        <input
          id={inputId}
          type="number"
          min={MIN_DISTANCE_KM}
          max={MAX_COMMUTE_KM}
          step={1}
          value={value}
          onChange={(event) => onChange(parseFloat(event.target.value) || MIN_DISTANCE_KM)}
          className={styles.input}
        />
        <span className={styles.label}>{t("commute_km")}</span>
      </div>
    </div>
  );
}

/** Props for the CommuteCompare multi-modal evaluation table. */
interface CommuteCompareProps {
  outdoorPm25: number;
  ageBand?: AgeBand | undefined;
  activeInterventionIds?: readonly string[] | undefined;
  onApplyIntervention?: ((id: string) => void) | undefined;
  onSelectMode?: ((mode: CommuteModeComparison) => void) | undefined;
}

/**
 * Accessible table comparing travel modes by personal inhaled particulate dose and greenhouse gas footprint.
 */
export function CommuteCompare({
  outdoorPm25,
  ageBand = "adult",
  activeInterventionIds = [],
  onApplyIntervention,
  onSelectMode,
}: CommuteCompareProps) {
  const { t } = useLocale();
  const [distanceKm, setDistanceKm] = useState(DEFAULT_COMMUTE_KM);
  const [chosenMode, setChosenMode] = useState<string | undefined>();

  const result = useMemo(() => compareCommuteModes({ distanceKm, outdoorPm25, ageBand }), [distanceKm, outdoorPm25, ageBand]);

  const useMode = (comparison: CommuteModeComparison) => {
    setChosenMode(comparison.mode);
    if (comparison.matchingInterventionId) onApplyIntervention?.(comparison.matchingInterventionId);
    onSelectMode?.(comparison);
  };

  const isApplied = ({ matchingInterventionId, mode }: CommuteModeComparison): boolean =>
    matchingInterventionId ? activeInterventionIds.includes(matchingInterventionId) : chosenMode === mode;

  return (
    <section className={styles.container} aria-labelledby="commute-compare-title">
      <header className={styles.header}>
        <h3 id="commute-compare-title" className={styles.title}>
          {t("commute_heading")}
        </h3>
        <p className={styles.subtitle}>{t("commute_subtitle")}</p>
      </header>

      <DistanceField value={distanceKm} onChange={setDistanceKm} />

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className="sr-only">{t("commute_table_caption")}</caption>
          <thead>
            <tr>
              {COLUMN_HEADINGS.map((key) => (
                <th key={key} scope="col" className={styles.th}>{t(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.modes.map((comparison) => (
              <CommuteModeRow key={comparison.mode} comparison={comparison} isApplied={isApplied(comparison)} onUse={useMode} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
