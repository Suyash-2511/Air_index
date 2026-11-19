"use client";

import type { PlanApiResponse } from "@/client/types";
import { useLocale } from "@/hooks";
import { ChangeCard } from "../plan";
import styles from "./PlanStep.module.css";

interface PlanChangesProps {
  ranked: PlanApiResponse["ranked"];
  activeIds: readonly string[];
  onToggle: (id: string, isActive: boolean) => void;
}

/** The ranked changes as cards the visitor can switch on, or a note when none would help. */
export function PlanChanges({ ranked, activeIds, onToggle }: PlanChangesProps) {
  const { t } = useLocale();
  return (
    <section className={styles.cardsSection} aria-labelledby="ranked-changes-title">
      <h3 id="ranked-changes-title" className={styles.cardsTitle}>
        {t("plan_changes_heading", { count: ranked.length })}
      </h3>
      {ranked.length === 0 ? (
        <p className={styles.emptyCards}>{t("plan_no_effective_changes")}</p>
      ) : (
        ranked.map((action, index) => (
          <ChangeCard key={action.id} rank={index + 1} action={action} isActive={activeIds.includes(action.id)} onToggle={onToggle} />
        ))
      )}
    </section>
  );
}
