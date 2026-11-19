"use client";

import { useMemo } from "react";
import { useLocale } from "@/hooks";
import type { RoutineItem } from "@/lib/routine";
import type { Household } from "@/lib/types";
import { ChangeSelectionProvider } from "./change-selection";
import { RoutineRow } from "./RoutineRow";
import styles from "./RoutineTimeline.module.css";

/** Props for the RoutineTimeline component. */
interface RoutineTimelineProps {
  items: readonly RoutineItem[];
  areaLabel: string;
  household: Household;
  activeIds: readonly string[];
  onToggleIntervention: (id: string, isActive: boolean) => void;
}

/**
 * Renders a time-ordered sequence of guidance events for the day,
 * complete with an interactive rail, savings badges, and calendar export links.
 */
export function RoutineTimeline({ items, areaLabel, household, activeIds, onToggleIntervention }: RoutineTimelineProps) {
  const { t } = useLocale();
  const memberNames = useMemo(() => new Map(household.members.map((member) => [member.id, member.label])), [household.members]);

  if (items.length === 0) return null;

  return (
    <section className={styles.container} aria-labelledby="routine-heading">
      <header className={styles.header}>
        <h3 id="routine-heading" className={styles.heading}>
          {t("timeline_heading")}
        </h3>
        <p className={styles.subtitle}>{t("timeline_subtitle", { area: areaLabel })}</p>
      </header>

      <ChangeSelectionProvider activeIds={activeIds} toggle={onToggleIntervention}>
        <ol className={styles.timelineList}>
          {items.map((item, index) => (
            <RoutineRow
              key={`routine-${item.startHour}-${item.endHour}-${item.kind}-${index}`}
              item={item}
              index={index}
              memberNames={item.memberIds.flatMap((id) => memberNames.get(id) || [])}
            />
          ))}
        </ol>
      </ChangeSelectionProvider>
    </section>
  );
}
