"use client";

import { useLocale } from "@/hooks";
import { formatClock } from "@/lib/format";
import { HOURS_PER_DAY } from "@/lib/time-units";
import type { DoseBreakdown } from "@/lib/types";
import { cssVars } from "../ui";
import styles from "./DayStrip.module.css";

/** Even a near-zero hour keeps a visible sliver of bar. */
const MIN_BAR_PERCENT = 3;

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

interface MemberStripProps {
  name: string;
  baseline: DoseBreakdown | undefined;
  current: DoseBreakdown | undefined;
  /** The tallest single-hour dose across the household, so every member's bars share one scale. */
  scaleMax: number;
  hasChangesActive: boolean;
}

/** The hour with the highest dose, or hour 0 with value 0 when nothing was inhaled. */
function findPeak(byHour: readonly number[] | undefined): { hour: number; value: number } {
  let peak = { hour: 0, value: 0 };
  byHour?.forEach((value, hour) => {
    if (value > peak.value) peak = { hour, value };
  });
  return peak;
}

interface HourBarProps {
  hour: number;
  dose: number;
  baselineDose: number;
  scaleMax: number;
  hasChangesActive: boolean;
  isPeak: boolean;
}

/** One hour's bar, with the part the chosen changes removed stacked above it. */
function HourBar({ hour, dose, baselineDose, scaleMax, hasChangesActive, isPeak }: HourBarProps) {
  const heightPct = Math.min(100, Math.max(MIN_BAR_PERCENT, (dose / scaleMax) * 100));
  const hasSaving = hasChangesActive && baselineDose > dose;
  const savedPct = hasSaving ? Math.min(100 - heightPct, ((baselineDose - dose) / scaleMax) * 100) : 0;

  return (
    <div className={styles.barCol} title={`${formatClock(hour)}: ${dose.toFixed(1)} µg`}>
      <div className={styles.stackedBar}>
        {savedPct > 0 && <div className={styles.barSaved} style={cssVars({ "--h": `${savedPct}%` })} />}
        <div
          className={styles.barActive}
          data-peak={isPeak}
          style={cssVars({ "--h": `${heightPct}%`, "--v": `${Math.round(heightPct)}%` })}
        />
      </div>
    </div>
  );
}

/** The same 24 numbers as the bars, for screen readers. */
function DoseTable({ name, byHour }: { name: string; byHour: readonly number[] | undefined }) {
  const { t } = useLocale();
  return (
    <table className="sr-only">
      <caption>{t("daystrip_table_caption", { name })}</caption>
      <thead>
        <tr>
          <th scope="col">{t("daystrip_th_hour")}</th>
          <th scope="col">{t("daystrip_th_dose")}</th>
        </tr>
      </thead>
      <tbody>
        {HOURS.map((hour) => (
          <tr key={hour}>
            <th scope="row">{formatClock(hour)}</th>
            <td>{(byHour?.[hour] ?? 0).toFixed(1)} µg</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One member's day as 24 bars, their total, and the peak hour. */
export function MemberStrip({ name, baseline, current, scaleMax, hasChangesActive }: MemberStripProps) {
  const { t } = useLocale();
  const currentTotal = Math.round(current?.totalMicrograms ?? 0);
  const baselineTotal = Math.round(baseline?.totalMicrograms ?? 0);
  const peak = findPeak(current?.byHour);

  return (
    <div className={styles.memberStrip}>
      <div className={styles.memberHeader}>
        <span className={styles.memberName}>{name}</span>
        <span className={`${styles.memberTotal} tabular-nums`}>
          {t("daystrip_today", { total: currentTotal.toLocaleString("en-IN") })}
          {hasChangesActive && baselineTotal > currentTotal && (
            <span className={styles.memberSaved}>−{(baselineTotal - currentTotal).toLocaleString("en-IN")} µg</span>
          )}
        </span>
      </div>

      <div className={styles.barsContainer} aria-hidden="true">
        {HOURS.map((hour) => {
          const dose = current?.byHour[hour] ?? 0;
          return (
            <HourBar
              key={hour}
              hour={hour}
              dose={dose}
              baselineDose={baseline?.byHour[hour] ?? dose}
              scaleMax={scaleMax}
              hasChangesActive={hasChangesActive}
              isPeak={hour === peak.hour && peak.value > 0}
            />
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

      <div className={styles.peakNotice}>{t("daystrip_peak", { clock: formatClock(peak.hour), val: peak.value.toFixed(1) })}</div>

      <DoseTable name={name} byHour={current?.byHour} />
    </div>
  );
}
