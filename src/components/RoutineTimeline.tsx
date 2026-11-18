"use client";

import { useMemo } from "react";
import type { RoutineItem } from "@/lib/routine/build-routine";
import { buildGoogleCalendarUrl } from "@/lib/routine/calendar-link";
import type { Household } from "@/lib/types";
import styles from "./RoutineTimeline.module.css";

/** Props for the RoutineTimeline component. */
export interface RoutineTimelineProps {
  items: readonly RoutineItem[];
  areaLabel: string;
  household: Household;
  activeIds: readonly string[];
  onToggleIntervention: (id: string, active: boolean) => void;
}

function formatHourRange(startHour: number, endHour: number): string {
  const formatH = (h: number) => {
    const norm = ((h % 24) + 24) % 24;
    const suffix = norm < 12 ? "AM" : "PM";
    const val = norm % 12 === 0 ? 12 : norm % 12;
    return { val, suffix };
  };
  const s = formatH(startHour);
  const e = formatH(endHour);
  if (s.suffix === e.suffix) {
    return `${s.val}–${e.val} ${s.suffix}`;
  }
  return `${s.val} ${s.suffix} – ${e.val} ${e.suffix}`;
}

function getDotClass(kind: RoutineItem["kind"]): string {
  switch (kind) {
    case "seal": return styles.dotSeal ?? "";
    case "ventilate":
    case "outdoor": return styles.dotClean ?? "";
    case "commute": return styles.dotAtmos ?? "";
    case "cook":
    case "sleep": return styles.dotNeutral ?? "";
  }
}

/**
 * Renders a time-ordered sequence of guidance events for the day,
 * complete with an interactive rail, savings badges, and calendar export links.
 */
export function RoutineTimeline({
  items,
  areaLabel,
  household,
  activeIds,
  onToggleIntervention,
}: RoutineTimelineProps) {
  const memberMap = useMemo(() => {
    return new Map(household.members.map((m) => [m.id, m.label]));
  }, [household.members]);

  if (items.length === 0) return null;

  return (
    <section className={styles.container} aria-labelledby="routine-heading">
      <header className={styles.header}>
        <h3 id="routine-heading" className={styles.heading}>
          Your routine for today
        </h3>
        <p className={styles.subtitle}>
          {areaLabel} · built from today&apos;s forecast
        </p>
      </header>

      <ol className={styles.timelineList}>
        {items.map((item, idx) => {
          const isChecked = item.interventionId ? activeIds.includes(item.interventionId) : false;
          const memberChips = item.memberIds.map((id) => memberMap.get(id)).filter(Boolean);

          return (
            <li
              key={`routine-${item.startHour}-${item.endHour}-${item.kind}-${idx}`}
              className={styles.timelineItem}
              style={{ animationDelay: `${700 + idx * 80}ms` }}
            >
              <div className={`${styles.timeCol} tabular-nums`}>
                {formatHourRange(item.startHour, item.endHour)}
              </div>

              <div className={styles.railCol}>
                <div className={styles.rail} aria-hidden="true" />
                <div className={`${styles.dot} ${getDotClass(item.kind)}`} aria-hidden="true" />
              </div>

              <div className={styles.contentCol}>
                <div className={styles.titleRow}>
                  <span className={styles.title}>{item.title}</span>
                  {item.savedMicrograms !== undefined && item.savedMicrograms > 0 && (
                    <span className={`${styles.savings} tabular-nums`}>
                      −{Math.round(item.savedMicrograms)} µg
                    </span>
                  )}
                </div>

                <p className={styles.detail}>{item.detail}</p>

                <div className={styles.metaRow}>
                  {memberChips.length > 0 && (
                    <div className={styles.chips} aria-label="Applies to">
                      {memberChips.map((name) => (
                        <span key={`${item.title}-${name}`} className={styles.chip}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.reducesOwnEmissions && (
                    <span className={styles.emissionsTag}>
                      Also cuts smog you make
                    </span>
                  )}

                  {item.interventionId && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isChecked}
                      onClick={() => onToggleIntervention(item.interventionId!, !isChecked)}
                      className={styles.switchButton}
                      aria-label={`Add ${item.title} to plan`}
                    >
                      <span className={styles.switchTrack}>
                        <span className={styles.switchThumb} />
                      </span>
                      <span className={styles.switchLabel}>Add to plan</span>
                    </button>
                  )}

                  <a
                    href={buildGoogleCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.calendarLink}
                    aria-label={`Add ${item.title} to Google Calendar`}
                  >
                    Add to Google Calendar
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
