"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { filterHacksByCost, type HackCost, INDOOR_HACKS } from "@/lib/indoor/hacks";
import type { TranslationKey } from "@/lib/i18n";
import styles from "./IndoorHacks.module.css";

/** Filter options for indoor hacks by budget tier. */
const COST_FILTERS: readonly { value: HackCost | "All"; labelKey: TranslationKey }[] = [
  { value: "All", labelKey: "cost_all" },
  { value: "Free", labelKey: "cost_free" },
  { value: "Under ₹500", labelKey: "cost_under_500" },
  { value: "Under ₹3,000", labelKey: "cost_under_3000" },
];

/** Props for the IndoorHacks card collection. */
export interface IndoorHacksProps {
  onSelectVentilate?: () => void;
}

/**
 * Grid of 8 practical evidence-based indoor air mitigations and myth-busters with cost filtering.
 */
export function IndoorHacks({ onSelectVentilate }: IndoorHacksProps) {
  const { t } = useLocale();
  const [selectedCost, setSelectedCost] = useState<HackCost | "All">("All");

  const filteredHacks = filterHacksByCost(INDOOR_HACKS, selectedCost);

  return (
    <section className={styles.container} aria-labelledby="indoor-hacks-heading">
      <header className={styles.header}>
        <h3 id="indoor-hacks-heading" className={styles.title}>{t("hacks_title")}</h3>
        <p className={styles.subtitle}>
          {t("hacks_subtitle")}
        </p>
      </header>

      <div className={styles.filters} role="group" aria-label={t("hacks_filter_aria")}>
        {COST_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={styles.filterBtn}
            data-active={selectedCost === item.value}
            onClick={() => setSelectedCost(item.value)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filteredHacks.map((hack) => (
          <article key={hack.id} className={styles.card} aria-labelledby={`hack-title-${hack.id}`}>
            <div className={styles.cardHead}>
              <div className={styles.tags}>
                <span className={hack.isMyth ? styles.mythTag : styles.costTag}>
                  {hack.isMyth ? t("hacks_myth_tag") : t(hack.costKey)}
                </span>
              </div>
              <h4 id={`hack-title-${hack.id}`} className={styles.cardTitle}>
                {t(hack.titleKey)}
              </h4>
            </div>

            <p className={styles.effect}>{t(hack.effectKey)}</p>

            <ol className={styles.steps}>
              {hack.stepKeys.map((stepKey, idx) => (
                <li key={idx}>{t(stepKey)}</li>
              ))}
            </ol>

            {hack.id === "ventilate_clean_hour" && onSelectVentilate && (
              <button type="button" onClick={onSelectVentilate} className={styles.routineLink}>
                {t("hacks_jump_routine")}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
