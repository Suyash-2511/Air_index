"use client";

import { useId, useState, type CSSProperties } from "react";
import type { RankedAction } from "@/client/types";
import { useLocale } from "@/hooks/useLocale";
import { toSentenceCase } from "@/components/labels";
import styles from "./ChangeCard.module.css";

/** Props for the interactive Ranked Change Card. */
export interface ChangeCardProps {
  action: RankedAction;
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
  /** 1-based position in the ranking, shown as a large numeral. */
  rank?: number;
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

  const title = toSentenceCase(action.explanation?.title ?? action.id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
  const savedUg = Math.round(action.savedMicrograms);
  const savedPct = Math.round(action.savedPercent);

  const effortText = action.effort === "free"
    ? t("effort_free")
    : action.effort === "low_cost"
      ? t("effort_low_cost")
      : t("effort_investment");

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.topRow}>
        {rank !== undefined && (
          <span className={styles.rank} aria-hidden="true">{String(rank).padStart(2, "0")}</span>
        )}
        <div className={styles.titleArea}>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.badges}>
            <span className={styles.effortBadge} data-effort={action.effort}>{effortText}</span>
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
        <span style={{ "--scale": Math.min(1, Math.max(0, savedPct / 100)) } as CSSProperties} />
      </div>

      {action.explanation && (
        <>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((prev) => !prev)}
            className={styles.expandButton}
          >
            {isExpanded ? t("change_hide_details") : t("change_show_details")}
          </button>

          {isExpanded && (
            <div id={detailsId} className={styles.details}>
              <p className={styles.whyText}>{action.explanation.whyItHelps}</p>
              {action.explanation.steps.length > 0 && (
                <ol className={styles.stepsList}>
                  {action.explanation.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              )}
              {action.reducesOwnEmissions && action.explanation.sustainableAlternative && (
                <div className={styles.sustainableBox}>
                  <strong>{t("change_clean_energy_note")}</strong> {action.explanation.sustainableAlternative}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
