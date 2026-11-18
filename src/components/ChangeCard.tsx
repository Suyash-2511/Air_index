"use client";

import { useId, useState } from "react";
import type { RankedAction } from "@/client/types";
import styles from "./ChangeCard.module.css";

/** Props for the interactive Ranked Change Card. */
export interface ChangeCardProps {
  action: RankedAction;
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
}

function formatEffort(effort: RankedAction["effort"]): string {
  if (effort === "free") return "Free";
  if (effort === "low_cost") return "Low Cost";
  return "Investment";
}

/**
 * Ranked intervention card displaying physical savings, an accessible switch toggle,
 * and grounded plain-language explanations. Toggling this switch recomputes household
 * exposure in real time with zero network requests.
 */
export function ChangeCard({ action, isActive, onToggle }: ChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const switchId = useId();
  const detailsId = useId();

  const title = action.explanation?.title ?? action.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const savedUg = Math.round(action.savedMicrograms);
  const savedPct = Math.round(action.savedPercent);

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.badges}>
            <span className={styles.effortBadge}>{formatEffort(action.effort)}</span>
            <span className={`${styles.savingsText} tabular-nums`}>
              Cuts {savedUg} µg ({savedPct}%)
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
