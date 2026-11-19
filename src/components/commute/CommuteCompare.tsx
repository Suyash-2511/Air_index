"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { type CommuteModeComparison, compareCommuteModes } from "@/lib/commute/compare";
import type { AgeBand } from "@/lib/types";
import styles from "./CommuteCompare.module.css";

/** Props for the CommuteCompare multi-modal evaluation table. */
export interface CommuteCompareProps {
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
  const [distanceKm, setDistanceKm] = useState(8);
  const [chosenMode, setChosenMode] = useState<string | undefined>();
  const distanceInputId = useId();

  const result = useMemo(() => {
    return compareCommuteModes({
      distanceKm,
      outdoorPm25,
      ageBand,
    });
  }, [distanceKm, outdoorPm25, ageBand]);

  const handleUseMode = (comparison: CommuteModeComparison) => {
    setChosenMode(comparison.mode);
    if (comparison.matchingInterventionId && onApplyIntervention) {
      onApplyIntervention(comparison.matchingInterventionId);
    }
    if (onSelectMode) {
      onSelectMode(comparison);
    }
  };

  return (
    <section className={styles.container} aria-labelledby="commute-compare-title">
      <header className={styles.header}>
        <h3 id="commute-compare-title" className={styles.title}>
          {t("commute_heading")}
        </h3>
        <p className={styles.subtitle}>
          {t("commute_subtitle")}
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.distanceField}>
          <label htmlFor={distanceInputId} className={styles.label}>
            {t("commute_distance_label")}
          </label>
          <input
            id={distanceInputId}
            type="number"
            min={1}
            max={50}
            step={1}
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 1)}
            className={styles.input}
          />
          <span className={styles.label}>{t("commute_km")}</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className="sr-only">
            {t("commute_table_caption")}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>{t("commute_th_mode")}</th>
              <th scope="col" className={styles.th}>{t("commute_th_duration")}</th>
              <th scope="col" className={styles.th}>{t("commute_th_dose")}</th>
              <th scope="col" className={styles.th}>{t("commute_th_co2")}</th>
              <th scope="col" className={styles.th}>{t("commute_th_action")}</th>
            </tr>
          </thead>
          <tbody>
            {result.modes.map((m) => {
              const isApplied = m.matchingInterventionId
                ? activeInterventionIds.includes(m.matchingInterventionId)
                : chosenMode === m.mode;
              const modeLabel = t(m.labelKey);

              return (
                <tr key={m.mode} className={styles.row} data-highlight={m.isBestForLungs || m.isBestForCity}>
                  <th scope="row" className={styles.td}>
                    {modeLabel}
                    {m.isBestForLungs && <span className={styles.badgeLungs}>{t("commute_badge_lungs")}</span>}
                    {m.isBestForCity && <span className={styles.badgeCity}>{t("commute_badge_city")}</span>}
                  </th>
                  <td className={styles.td}>{m.durationMin} {t("commute_min_unit")}</td>
                  <td className={styles.td}>{m.inhaledMicrograms} {t("commute_ug_unit")}</td>
                  <td className={styles.td}>{m.co2Grams} {t("commute_g_unit")}</td>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className={styles.useBtn}
                      data-active={isApplied}
                      onClick={() => handleUseMode(m)}
                      aria-label={t("commute_btn_aria", { mode: modeLabel })}
                    >
                      {isApplied ? t("commute_btn_applied") : t("commute_btn_use")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
