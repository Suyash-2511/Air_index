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
 * Displays amber intake bars, rule grid, and saved reductions in teal.
 * Features an accessible hidden data table for screen readers.
 */
export function DayStrip({
  household,
  baselineDoses,
  currentDoses,
  hasChangesActive,
}: DayStripProps) {
  let globalMaxHour = 1;
  for (const b of baselineDoses) {
    for (const hVal of b.byHour) {
      if (hVal > globalMaxHour) globalMaxHour = hVal;
    }
  }

  return (
    <div className={styles.container} aria-labelledby="day-strip-title">
      <h3 id="day-strip-title" className={styles.title}>
        Your household, hour by hour
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
                {currentTotal.toLocaleString("en-IN")} µg today
                {hasChangesActive && baseTotal > currentTotal && (
                  <span className={styles.memberSaved}>
                    −{(baseTotal - currentTotal).toLocaleString("en-IN")} µg
                  </span>
                )}
              </span>
            </div>

            <div className={styles.barsContainer} aria-hidden="true">
              {Array.from({ length: 24 }, (_, h) => {
                const hourDose = current?.byHour[h] ?? 0;
                const baseHourDose = base?.byHour[h] ?? hourDose;
                const heightPct = Math.min(100, Math.max(3, (hourDose / globalMaxHour) * 100));
                const savedPct = hasChangesActive && baseHourDose > hourDose
                  ? Math.min(100 - heightPct, ((baseHourDose - hourDose) / globalMaxHour) * 100)
                  : 0;

                return (
                  <div key={h} className={styles.barCol} title={`${formatClockHour(h)}: ${hourDose.toFixed(1)} µg`}>
                    <div className={styles.stackedBar}>
                      {savedPct > 0 && (
                        <div
                          className={styles.barSaved}
                          style={{ height: `${savedPct}%` }}
                        />
                      )}
                      <div
                        className={styles.barActive}
                        data-peak={h === peakHour && peakValue > 0}
                        style={{ height: `${heightPct}%`, ["--v" as string]: `${Math.round(heightPct)}%` }}
                      />
                    </div>
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
