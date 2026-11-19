"use client";

import type { CSSProperties } from "react";
import { useLocale } from "@/hooks/useLocale";
import { IconArrowRight } from "../ui/icons";
import styles from "./LandingHero.module.css";
import { StationReading } from "./StationReading";

export interface LandingHeroProps {
  onPlanHome: () => void;
  onSampleFamily: () => void;
  /** Live outdoor PM2.5; undefined while loading or when air data is unavailable. */
  livePm25?: number | undefined;
  cityName?: string;
  /** True when the reading is for the visitor's own location rather than the default city. */
  isLive?: boolean;
  aqi?: { value: number; category: string } | undefined;
}

/**
 * Landing introduction, set as the front page of a bulletin: a kicker, the headline,
 * today's station reading, and the two ways in.
 */
export function LandingHero({ onPlanHome, onSampleFamily, livePm25, cityName = "New Delhi", isLive = false, aqi }: LandingHeroProps) {
  const { t } = useLocale();

  const steps = [
    { n: "01", text: t("hero_step1") },
    { n: "02", text: t("hero_step2") },
    { n: "03", text: t("hero_step3") },
  ] as const;

  return (
    <section className={styles.heroSection} aria-labelledby="landing-headline">
      <div className={styles.content}>
        <p className={styles.kicker}>{t("hero_kicker")}</p>

        <h2 id="landing-headline" className={styles.headline}>
          <span className={styles.maskLine}>
            <span className={styles.line1}>{t("hero_line1")}</span>
          </span>{" "}
          <span className={styles.maskLine}>
            <span className={styles.line2}>
              <em className={styles.italic}>{t("hero_line2_italic")}</em> {t("hero_line2_rest")}
            </span>
          </span>
        </h2>

        <p className={styles.sentence}>{t("hero_sentence")}</p>

        <div className={styles.actionRow}>
          <button type="button" onClick={onPlanHome} className={styles.buttonPrimary}>
            <span>{t("hero_plan_home")}</span>
            <span className={styles.arrow} aria-hidden="true">
              <IconArrowRight size={18} />
            </span>
          </button>
          <button type="button" onClick={onSampleFamily} className={styles.buttonSecondary}>
            {t("hero_sample_family")}
          </button>
        </div>

        <StationReading livePm25={livePm25} cityName={cityName} isLive={isLive} aqi={aqi} />

        <ol className={styles.steps} aria-label={t("hero_how_it_works")}>
          {steps.map((s, i) => (
            <li key={s.n} className={styles.step} style={{ "--i": i } as CSSProperties}>
              <span className={styles.stepNumber} aria-hidden="true">
                {s.n}
              </span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
