"use client";

import { useId, useState } from "react";
import type { RankedAction } from "@/client/types";
import { useLocale } from "@/hooks";
import { toSentenceCase } from "@/lib/labels";
import { cssVars } from "../ui";
import styles from "./ChangeCard.module.css";

/** Translation key for how hard each kind of change is to do. */
const EFFORT_KEYS = { free: "effort_free", low_cost: "effort_low_cost", investment: "effort_investment" } as const;

/** Props for the interactive Ranked Change Card. */
interface ChangeCardProps {
  action: RankedAction;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  /** 1-based position in the ranking, shown as a large numeral. */
  rank?: number;
}

type Explanation = NonNullable<RankedAction["explanation"]>;

/** The change's own title, or its id made readable when no explanation came with it. */
function titleOf(action: RankedAction): string {
  const readableId = action.id.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
  return toSentenceCase(action.explanation?.title ?? readableId);
}

interface ChangeDetailsProps {
  id: string;
  explanation: Explanation;
  hasCleanerAlternative: boolean;
}

/** Why the change helps and how to do it, shown when the card is expanded. */
function ChangeDetails({ id, explanation, hasCleanerAlternative }: ChangeDetailsProps) {
  const { t } = useLocale();
  return (
    <div id={id} className={styles.details}>
      <p className={styles.whyText}>{explanation.whyItHelps}</p>
      {explanation.steps.length > 0 && (
        <ol className={styles.stepsList}>
          {explanation.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {hasCleanerAlternative && explanation.sustainableAlternative && (
        <div className={styles.sustainableBox}>
          <strong>{t("change_clean_energy_note")}</strong> {explanation.sustainableAlternative}
        </div>
      )}
    </div>
  );
}

/**
 * Ranked intervention card displaying physical savings, an accessible switch toggle,
 * and grounded plain-language explanations. Toggling this switch recomputes household
 * exposure in real time with zero network requests.
 */
export function ChangeCard({ action, isActive, onToggle, rank }: ChangeCardProps) {
  const { t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const switchId = useId();
  const detailsId = useId();

  const title = titleOf(action);
  const savedUg = Math.round(action.savedMicrograms);
  const savedPct = Math.round(action.savedPercent);

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.topRow}>
        {rank !== undefined && <span className={styles.rank} aria-hidden="true">{String(rank).padStart(2, "0")}</span>}
        <div className={styles.titleArea}>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.badges}>
            <span className={styles.effortBadge} data-effort={action.effort}>{t(EFFORT_KEYS[action.effort])}</span>
            <span className={`${styles.savingsText} tabular-nums`}>
              {t("change_savings", { pct: savedPct, ug: savedUg.toLocaleString("en-IN") })}
            </span>
          </div>
        </div>

        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={t("change_toggle_aria", { title })}
          onClick={() => onToggle(action.id, !isActive)}
          className={styles.switchButton}
        >
          <span className={styles.switchHandle} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.meter} aria-hidden="true">
        <span style={cssVars({ "--scale": Math.min(1, Math.max(0, savedPct / 100)) })} />
      </div>

      {action.explanation && (
        <>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((previous) => !previous)}
            className={styles.expandButton}
          >
            {isExpanded ? t("change_hide_details") : t("change_show_details")}
          </button>
          {isExpanded && <ChangeDetails id={detailsId} explanation={action.explanation} hasCleanerAlternative={action.reducesOwnEmissions} />}
        </>
      )}
    </article>
  );
}
