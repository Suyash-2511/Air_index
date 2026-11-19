"use client";

import type { CSSProperties } from "react";
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
  return (
    <header className={styles.headlineArea}>
      <p className={styles.kicker}>Entry 03 · Today&apos;s dose</p>
      <h2 className={styles.headlineMain}>
        <span className={styles.lead}>Today your household will breathe</span>{" "}
        <span className={styles.figureMask}>
          <span className={styles.figure}>
            {(activeCount === 0 ? animatedBaseline : currentTotal).toLocaleString("en-IN")}
            <span className={styles.unit}> µg</span>
          </span>
        </span>{" "}
        <span className={styles.lead}>of PM2.5.</span>
      </h2>
      <div className={styles.meter} aria-hidden="true">
        <span
          className={styles.meterFill}
          style={{ "--scale": baselineTotal > 0 ? currentTotal / baselineTotal : 1 } as CSSProperties}
        />
      </div>
      <div className={styles.meterLabels} aria-hidden="true">
        <span>With your changes</span>
        <span>Baseline {baselineTotal.toLocaleString("en-IN")} µg</span>
      </div>
      <p className={styles.headlineCut}>
        {activeCount === 0 ? (
          <>These changes could cut that by up to <span className="tabular-nums">{maxPotentialSavingsPct}%</span>.</>
        ) : (
          <>Cutting exposure by <span className="tabular-nums">{currentSavedPct}%</span> ({currentSavedUg} µg saved) with {activeCount} active change{activeCount > 1 ? "s" : ""}.</>
        )}
      </p>
    </header>
  );
}
