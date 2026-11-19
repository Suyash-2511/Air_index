"use client";

import type { CSSProperties } from "react";
import { useLocale } from "@/hooks/useLocale";
import styles from "./PlanHeadline.module.css";

/** Props for the PlanHeadline component. */
export interface PlanHeadlineProps {
  baselineTotal: number;
  currentTotal: number;
  activeCount: number;
  animatedBaseline: number;
  maxPotentialSavingsPct: number;
  currentSavedPct: number;
  currentSavedUg: number;
}

/**
 * Headline area for Step 3 displaying animated inhaled PM2.5 dose count-up,
 * visual dose comparison meter, and exposure reduction summaries.
 */
export function PlanHeadline({
  baselineTotal,
  currentTotal,
  activeCount,
  animatedBaseline,
  maxPotentialSavingsPct,
  currentSavedPct,
  currentSavedUg,
}: PlanHeadlineProps) {
  const { t } = useLocale();

  return (
    <header className={styles.headlineArea}>
      <p className={styles.kicker}>{t("plan_headline_kicker")}</p>
      <h2 className={styles.headlineMain}>
        <span className={styles.lead}>{t("plan_headline_lead1")}</span>{" "}
        <span className={styles.figureMask}>
          <span className={styles.figure}>
            {(activeCount === 0 ? animatedBaseline : currentTotal).toLocaleString("en-IN")}
            <span className={styles.unit}> µg</span>
          </span>
        </span>{" "}
        <span className={styles.lead}>{t("plan_headline_lead2")}</span>
      </h2>
      <div className={styles.meter} aria-hidden="true">
        <span
          className={styles.meterFill}
          style={{ "--scale": baselineTotal > 0 ? currentTotal / baselineTotal : 1 } as CSSProperties}
        />
      </div>
      <div className={styles.meterLabels} aria-hidden="true">
        <span>{t("plan_headline_with_changes")}</span>
        <span>{t("plan_headline_baseline", { val: baselineTotal.toLocaleString("en-IN") })}</span>
      </div>
      <p className={styles.headlineCut}>
        {activeCount === 0 ? (
          t("plan_headline_potential_cut", { pct: maxPotentialSavingsPct })
        ) : activeCount === 1 ? (
          t("plan_headline_cutting_active_one", { pct: currentSavedPct, saved: currentSavedUg })
        ) : (
          t("plan_headline_cutting_active_other", { pct: currentSavedPct, saved: currentSavedUg, count: activeCount })
        )}
      </p>
    </header>
  );
}
