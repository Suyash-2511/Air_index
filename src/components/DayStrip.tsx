"use client";

import type { DoseBreakdown, Household } from "@/lib/types";
import styles from "./DayStrip.module.css";

/** Props for the 24-hour DayStrip dose visualizer. */
export interface DayStripProps {
  household: Household;
  baselineDoses: readonly DoseBreakdown[];
  currentDoses: readonly DoseBreakdown[];
  hasChangesActive: boolean;
}

function formatClockHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const num = h % 12 === 0 ? 12 : h % 12;
  return `${num} ${period}`;
}

/**
 * 24-hour visual exposure timeline rendering hourly inhaled PM2.5 doses per member.
 * Displays peak exposure times in plain words, supports scaleY shrink transitions
 * on intervention toggling, and provides an accessible hidden data table for screen readers.
 */
export function DayStrip({
  household,
  baselineDoses,
  currentDoses,
  hasChangesActive,
}: DayStripProps) {
  // Find global maximum single-hour dose to scale bar heights proportionally
  let globalMaxHour = 1;
  for (const b of baselineDoses) {
    for (const hVal of b.byHour) {
      if (hVal > globalMaxHour) globalMaxHour = hVal;
    }
  }

  return (
    <div className={styles.container} aria-labelledby="day-strip-title">
      <h3 id="day-strip-title" className={styles.title}>
        Your Household's 24-Hour Day
      </h3>

      {household.members.map((member, mIdx) => {
        const base = baselineDoses[mIdx];
        const current = currentDoses[mIdx] ?? base;
        const currentTotal = Math.round(current?.totalMicrograms ?? 0);
        const baseTotal = Math.round(base?.totalMicrograms ?? 0);

        let peakHour = 0;
        let peakValue = 0;
        current?.byHour.forEach((val, h) => {
          if (val > peakValue) {
            peakValue = val;
            peakHour = h;
          }
        });

        return (
          <div key={member.id} className={styles.memberStrip}>
            <div className={styles.memberHeader}>
              <span className={styles.memberName}>{member.label}</span>
              <span className={`${styles.memberTotal} tabular-nums`}>
                {currentTotal} µg today
                {hasChangesActive && baseTotal > currentTotal && (
                  <span style={{ color: "var(--teal)", marginLeft: "8px" }}>
                    (-{baseTotal - currentTotal} µg saved)
                  </span>
                )}
              </span>
            </div>

            <div className={styles.barsContainer} aria-hidden="true">
              {Array.from({ length: 24 }, (_, h) => {
                const hourDose = current?.byHour[h] ?? 0;
                const baseHourDose = base?.byHour[h] ?? hourDose;
                const heightPct = Math.min(100, Math.max(4, (hourDose / globalMaxHour) * 100));
                const isSaved = hasChangesActive && hourDose < baseHourDose;

                return (
                  <div key={h} className={styles.barCol} title={`${formatClockHour(h)}: ${hourDose.toFixed(1)} µg`}>
                    <div
                      className={`${styles.bar} ${isSaved ? styles.barSaved : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.axisLabels} aria-hidden="true">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>

            <div className={styles.peakNotice}>
              Peak intake at {formatClockHour(peakHour)} ({peakValue.toFixed(1)} µg)
            </div>

            {/* Screen reader accessible data table */}
            <table className="sr-only">
              <caption>Hourly inhaled PM2.5 dose breakdown for {member.label}</caption>
              <thead>
                <tr>
                  <th scope="col">Hour</th>
                  <th scope="col">Inhaled Dose (µg)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }, (_, h) => (
                  <tr key={h}>
                    <th scope="row">{formatClockHour(h)}</th>
                    <td>{(current?.byHour[h] ?? 0).toFixed(1)} µg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
