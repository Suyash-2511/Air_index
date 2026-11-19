"use client";

import { useLocale } from "@/hooks";
import { InversionDiagram } from "./InversionDiagram";
import styles from "./InversionExplainer.module.css";

const STEP_NUMBERS = [1, 2, 3] as const;

/**
 * Explainer card illustrating the meteorological mechanics of nocturnal temperature inversions.
 */
export function InversionExplainer() {
  const { t } = useLocale();

  return (
    <article id="inversion-explainer" className={styles.card} aria-labelledby="inversion-title">
      <header className={styles.header}>
        <h3 id="inversion-title" className={styles.title}>
          {t("inversion_title")}
        </h3>
        <p className={styles.description}>{t("inversion_desc")}</p>
      </header>

      <div className={styles.diagramContainer}>
        <InversionDiagram />

        <div className={styles.stepsGrid}>
          {STEP_NUMBERS.map((number) => (
            <div key={number} className={styles.step}>
              <span className={styles.stepNum}>{t(`inversion_step${number}_label`)}</span>
              <strong className={styles.stepTitle}>{t(`inversion_step${number}_heading`)}</strong>
              <p className={styles.stepText}>{t(`inversion_step${number}_text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
