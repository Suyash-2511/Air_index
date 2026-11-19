"use client";

import { useLocale } from "@/hooks/useLocale";
import { IconCheck } from "../ui/icons";
import styles from "./StepNav.module.css";

/** Step number in the 3-step Saans workflow. */
export type StepNumber = 1 | 2 | 3;

/** Props for the StepNav progress component. */
export interface StepNavProps {
  currentStep: StepNumber;
}

/**
 * Accessible step progress indicator with aria-current marking the active stage.
 * Uses 1.5px stroke check icon on completed steps without emojis.
 */
export function StepNav({ currentStep }: StepNavProps) {
  const { t } = useLocale();

  const steps = [
    { step: 1, label: t("step1_nav") },
    { step: 2, label: t("step2_nav") },
    { step: 3, label: t("step3_nav") },
  ] as const;

  const currentLabel = steps[currentStep - 1]?.label ?? "";

  return (
    <nav className={styles.nav} aria-label={t("planning_progress")}>
      <div className="sr-only" aria-live="polite">
        {t("step_progress_announcement", { current: currentStep, label: currentLabel })}
      </div>
      <ol className={styles.stepList}>
        {steps.map((s, idx) => {
          const isActive = s.step === currentStep;
          const isCompleted = s.step < currentStep;
          const statusClass = isActive
            ? styles.stepActive
            : isCompleted
              ? styles.stepCompleted
              : "";

          return (
            <li
              key={s.step}
              className={`${styles.stepItem} ${statusClass}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {isCompleted ? <IconCheck size={12} /> : s.step}
              </span>
              <span>{s.label}</span>
              {idx < steps.length - 1 && <span className={styles.separator} aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
