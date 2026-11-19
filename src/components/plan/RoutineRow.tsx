"use client";

import { useLocale } from "@/hooks";
import { formatHourRange } from "@/lib/format";
import { buildGoogleCalendarUrl, type RoutineItem } from "@/lib/routine";
import { cssVars } from "../ui";
import { useChangeSelection } from "./change-selection";
import styles from "./RoutineTimeline.module.css";

/** Dot colour on the rail for each kind of step. */
const DOT_CLASS: Record<RoutineItem["kind"], string | undefined> = {
  seal: styles.dotSeal,
  ventilate: styles.dotClean,
  outdoor: styles.dotClean,
  commute: styles.dotAtmos,
  cook: styles.dotNeutral,
  sleep: styles.dotNeutral,
};

/** Where a step's "learn more" link points, for the kinds that have one. */
const LEARN_MORE: Partial<Record<RoutineItem["kind"], { href: string; labelKey: string }>> = {
  seal: { href: "#inversion-explainer", labelKey: "timeline_inversion_link" },
  ventilate: { href: "#indoor-hacks-heading", labelKey: "timeline_ventilation_link" },
};

interface RoutineRowProps {
  item: RoutineItem;
  index: number;
  /** Names of the household members this step applies to. */
  memberNames: readonly string[];
}

/** The switch that adds this step's change to the plan, reading the selection from context. */
function PlanSwitch({ interventionId, title }: { interventionId: string; title: string }) {
  const { t } = useLocale();
  const { activeIds, toggle } = useChangeSelection();
  const isChecked = activeIds.includes(interventionId);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={() => toggle(interventionId, !isChecked)}
      className={styles.switchButton}
      aria-label={t("timeline_add_to_plan_aria", { title })}
    >
      <span className={styles.switchTrack}>
        <span className={styles.switchThumb} />
      </span>
      <span className={styles.switchLabel}>{t("timeline_add_to_plan")}</span>
    </button>
  );
}

function RowActions({ item, title }: { item: RoutineItem; title: string }) {
  const { t } = useLocale();
  const learnMore = LEARN_MORE[item.kind];
  return (
    <>
      {item.interventionId && <PlanSwitch interventionId={item.interventionId} title={title} />}
      {learnMore && (
        <a href={learnMore.href} className={styles.calendarLink}>
          {t(learnMore.labelKey)}
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
    </>
  );
}

/** One step of the day: its time, what to do, why, who it is for, and how to act on it. */
export function RoutineRow({ item, index, memberNames }: RoutineRowProps) {
  const { t } = useLocale();
  const title = item.titleKey ? t(item.titleKey) : item.title;
  const detail = item.detailKey ? t(item.detailKey, item.detailParams) : item.detail;
  const hasSavings = (item.savedMicrograms ?? 0) > 0;

  return (
    <li className={styles.timelineItem} style={cssVars({ "--i": index })}>
      <div className={`${styles.timeCol} tabular-nums`}>{formatHourRange(item.startHour, item.endHour)}</div>

      <div className={styles.railCol}>
        <div className={styles.rail} aria-hidden="true" />
        <div className={`${styles.dot} ${DOT_CLASS[item.kind] ?? ""}`} aria-hidden="true" />
      </div>

      <div className={styles.contentCol}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          {hasSavings && <span className={`${styles.savings} tabular-nums`}>−{Math.round(item.savedMicrograms ?? 0)} µg</span>}
        </div>

        <p className={styles.detail}>{detail}</p>

        <div className={styles.metaRow}>
          {memberNames.length > 0 && (
            <div className={styles.chips} aria-label={t("timeline_applies_to_aria")}>
              {memberNames.map((name) => (
                <span key={`${item.title}-${name}`} className={styles.chip}>
                  {name}
                </span>
              ))}
            </div>
          )}
          {item.reducesOwnEmissions && <span className={styles.emissionsTag}>{t("timeline_cuts_own_smog")}</span>}
          <RowActions item={item} title={title} />
        </div>
      </div>
    </li>
  );
}
