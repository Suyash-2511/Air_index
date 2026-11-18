"use client";

import { useId, useState } from "react";
import type { RankedAction } from "@/client/types";
import { toSentenceCase } from "./labels";
import styles from "./ChangeCard.module.css";

/** Props for the interactive Ranked Change Card. */
export interface ChangeCardProps {
  action: RankedAction;
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
  /** 1-based position in the ranking, shown as a large numeral. */
  rank?: number;
}

function formatEffort(effort: RankedAction["effort"]): string {
  if (effort === "free") return "Free";
  if (effort === "low_cost") return "Low cost";
  return "Investment";
}

/**
 * Ranked intervention card displaying physical savings, an accessible switch toggle,
 * and grounded plain-language explanations. Toggling this switch recomputes household
 * exposure in real time with zero network requests.
 */
export function ChangeCard({ action, isActive, onToggle, rank }: ChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const switchId = useId();
  const detailsId = useId();

  const title = toSentenceCase(action.explanation?.title ?? action.id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
  const savedUg = Math.round(action.savedMicrograms);
  const savedPct = Math.round(action.savedPercent);

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.topRow}>
        {rank !== undefined && (
          <span className={styles.rank} aria-hidden="true">{String(rank).padStart(2, "0")}</span>
        )}
        <div className={styles.titleArea}>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.badges}>
            <span className={styles.effortBadge} data-effort={action.effort}>{formatEffort(action.effort)}</span>
            <span className={`${styles.savingsText} tabular-nums`}>
              −{savedPct}% · {savedUg.toLocaleString("en-IN")} µg less
            </span>
          </div>
        </div>

        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`Toggle ${title}`}
          onClick={() => onToggle(action.id, !isActive)}
          className={styles.switchButton}
        >
          <span className={styles.switchHandle} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.meter} aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, savedPct / 100))})` }} />
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
            {isExpanded ? "Hide details ↑" : "How to do this ↓"}
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
                  <strong>Clean energy note:</strong> {action.explanation.sustainableAlternative}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
