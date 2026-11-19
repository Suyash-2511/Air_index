"use client";

import { useLocale } from "@/hooks";
import type { DoseBreakdown, Household } from "@/lib/types";
import styles from "./DayStrip.module.css";
import { MemberStrip } from "./MemberStrip";

/** Props for the 24-hour DayStrip dose visualizer. */
interface DayStripProps {
  household: Household;
  baselineDoses: readonly DoseBreakdown[];
  currentDoses: readonly DoseBreakdown[];
  hasChangesActive: boolean;
}

/** The tallest single-hour dose in the baseline, never below 1 so an empty day does not divide by zero. */
function tallestBaselineHour(baselineDoses: readonly DoseBreakdown[]): number {
  return Math.max(1, ...baselineDoses.flatMap((dose) => dose.byHour));
}

/**
 * 24-hour visual exposure timeline rendering hourly inhaled PM2.5 doses per member.
 * Displays amber intake bars, rule grid, and saved reductions in teal.
 * Features an accessible hidden data table for screen readers.
 */
export function DayStrip({ household, baselineDoses, currentDoses, hasChangesActive }: DayStripProps) {
  const { t } = useLocale();
  const scaleMax = tallestBaselineHour(baselineDoses);

  return (
    <div className={styles.container} aria-labelledby="day-strip-title">
      <h3 id="day-strip-title" className={styles.title}>
        {t("daystrip_title")}
      </h3>

      {household.members.map((member, index) => (
        <MemberStrip
          key={member.id}
          name={member.label}
          baseline={baselineDoses[index]}
          current={currentDoses[index] ?? baselineDoses[index]}
          scaleMax={scaleMax}
          hasChangesActive={hasChangesActive}
        />
      ))}
    </div>
  );
}
