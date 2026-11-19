"use client";

import { useMemo, type CSSProperties } from "react";
import { useLocale } from "@/hooks/useLocale";
import { formatHourRange } from "@/lib/format/time";
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
  const { t } = useLocale();
  const memberMap = useMemo(() => {
    return new Map(household.members.map((m) => [m.id, m.label]));
  }, [household.members]);

  if (items.length === 0) return null;

  return (
    <section className={styles.container} aria-labelledby="routine-heading">
      <header className={styles.header}>
        <h3 id="routine-heading" className={styles.heading}>
          {t("timeline_heading")}
        </h3>
        <p className={styles.subtitle}>
          {t("timeline_subtitle", { area: areaLabel })}
        </p>
      </header>

      <ol className={styles.timelineList}>
        {items.map((item, idx) => {
          const isChecked = item.interventionId ? activeIds.includes(item.interventionId) : false;
          const memberChips = item.memberIds.map((id) => memberMap.get(id)).filter(Boolean);
          const title = item.titleKey ? t(item.titleKey) : item.title;
          const detail = item.detailKey ? t(item.detailKey, item.detailParams) : item.detail;

          return (
            <li
              key={`routine-${item.startHour}-${item.endHour}-${item.kind}-${idx}`}
              className={styles.timelineItem}
              style={{ "--i": idx } as CSSProperties}
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
                  <span className={styles.title}>{title}</span>
                  {item.savedMicrograms !== undefined && item.savedMicrograms > 0 && (
                    <span className={`${styles.savings} tabular-nums`}>
                      −{Math.round(item.savedMicrograms)} µg
                    </span>
                  )}
                </div>

                <p className={styles.detail}>{detail}</p>

                <div className={styles.metaRow}>
                  {memberChips.length > 0 && (
                    <div className={styles.chips} aria-label={t("timeline_applies_to_aria")}>
                      {memberChips.map((name) => (
                        <span key={`${item.title}-${name}`} className={styles.chip}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.reducesOwnEmissions && (
                    <span className={styles.emissionsTag}>
                      {t("timeline_cuts_own_smog")}
                    </span>
                  )}

                  {item.interventionId && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isChecked}
                      onClick={() => onToggleIntervention(item.interventionId!, !isChecked)}
                      className={styles.switchButton}
                      aria-label={t("timeline_add_to_plan_aria", { title })}
                    >
                      <span className={styles.switchTrack}>
                        <span className={styles.switchThumb} />
                      </span>
                      <span className={styles.switchLabel}>{t("timeline_add_to_plan")}</span>
                    </button>
                  )}

                  {item.kind === "seal" && (
                    <a href="#inversion-explainer" className={styles.calendarLink}>
                      {t("timeline_inversion_link")}
                    </a>
                  )}
                  {item.kind === "ventilate" && (
                    <a href="#indoor-hacks-heading" className={styles.calendarLink}>
                      {t("timeline_ventilation_link")}
                    </a>
                  )}

                  <a
                    href={buildGoogleCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.calendarLink}
                    aria-label={t("timeline_add_calendar_aria", { title })}
                  >
                    {t("timeline_add_calendar")}
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
