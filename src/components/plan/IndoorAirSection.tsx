"use client";

import { useLocale } from "@/hooks";
import { IndoorHacks } from "../indoor";
import { PurifierCalculator } from "../indoor";
import styles from "./IndoorAirSection.module.css";

/** Props for the IndoorAirSection component. */
interface IndoorAirSectionProps {
  outdoorPm25: number;
}

/**
 * Section combining the CADR air purifier calculator and evidence-based indoor hacks.
 */
export function IndoorAirSection({ outdoorPm25 }: IndoorAirSectionProps) {
  const { t } = useLocale();

  const handleScrollToVentilate = () => {
    const el = document.getElementById("routine-heading");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className={styles.section} aria-labelledby="indoor-air-title">
      <header className={styles.header}>
        <h3 id="indoor-air-title" className={styles.heading}>
          {t("indoor_heading")}
        </h3>
        <p className={styles.subtitle}>
          {t("indoor_subtitle")}
        </p>
      </header>
      <div className={styles.content}>
        <PurifierCalculator outdoorPm25={outdoorPm25} />
        <IndoorHacks onSelectVentilate={handleScrollToVentilate} />
      </div>
    </section>
  );
}
