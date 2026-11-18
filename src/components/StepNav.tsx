"use client";

import styles from "./StepNav.module.css";

/** Step number in the 3-step Saans workflow. */
export type StepNumber = 1 | 2 | 3;

/** Props for the StepNav progress component. */
export interface StepNavProps {
  currentStep: StepNumber;
}

const STEPS = [
  { step: 1, label: "Where are you?" },
  { step: 2, label: "Who lives here?" },
  { step: 3, label: "Your plan" },
] as const;

/**
 * Accessible step progress indicator with aria-current marking the active stage.
 */
export function StepNav({ currentStep }: StepNavProps) {
  return (
    <nav className={styles.nav} aria-label="Planning progress">
      <div className="sr-only" aria-live="polite">
        Step {currentStep} of 3: {STEPS[currentStep - 1]?.label}
      </div>
      <ol className={styles.stepList}>
        {STEPS.map((s, idx) => {
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
                {isCompleted ? "✓" : s.step}
              </span>
              <span>{s.label}</span>
              {idx < STEPS.length - 1 && <span className={styles.separator} aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
