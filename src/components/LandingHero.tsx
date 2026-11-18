"use client";

import { IconArrowRight } from "./icons";
import styles from "./LandingHero.module.css";

export interface LandingHeroProps {
  onPlanHome: () => void;
  onSampleFamily: () => void;
  /** Live outdoor PM2.5; undefined while loading or when air data is unavailable. */
  livePm25?: number | undefined;
  cityName?: string;
}

const STEPS = [
  { n: "01", text: "Choose your area" },
  { n: "02", text: "Describe who lives at home" },
  { n: "03", text: "Switch on changes and watch the dose fall" },
] as const;

/**
 * Landing introduction: a live air reading, the headline, and the two ways in.
 * The reading is only shown once it has really loaded, never as a placeholder number.
 */
export function LandingHero({ onPlanHome, onSampleFamily, livePm25, cityName = "New Delhi" }: LandingHeroProps) {
  const hasReading = livePm25 !== undefined;
  const reading = hasReading ? Math.round(livePm25) : undefined;

  return (
    <section className={styles.heroSection} aria-labelledby="landing-headline">
      <div className={styles.content}>
        <p
          className={styles.eyebrow}
          aria-live="polite"
          aria-label={
            hasReading
              ? `Outdoor air now in ${cityName}: PM2.5 ${reading} micrograms per cubic metre`
              : `Loading outdoor air for ${cityName}`
          }
        >
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.city}>{cityName}</span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.reading}>
            {hasReading ? (
              <>
                PM2.5 <strong>{reading}</strong> <span className={styles.unit}>µg/m³</span>
              </>
            ) : (
              "Reading the air…"
            )}
          </span>
        </p>

        <h2 id="landing-headline" className={styles.headline}>
          <span className={styles.maskLine}>
            <span className={styles.line1}>What your family</span>
          </span>{" "}
          <span className={styles.maskLine}>
            <span className={styles.line2}>
              <em className={styles.italic}>actually</em> breathes today.
            </span>
          </span>
        </h2>

        <p className={styles.sentence}>
          Saans turns today&apos;s air forecast into a plan for your household, and shows exactly how much each
          change cuts what you inhale.
        </p>

        <div className={styles.actionRow}>
          <button type="button" onClick={onPlanHome} className={styles.buttonPrimary}>
            <span>Plan today for my home</span>
            <span className={styles.arrow} aria-hidden="true">
              <IconArrowRight size={18} />
            </span>
          </button>
          <button type="button" onClick={onSampleFamily} className={styles.buttonSecondary}>
            See a sample family
          </button>
        </div>

        <ol className={styles.steps} aria-label="How it works">
          {STEPS.map((s) => (
            <li key={s.n} className={styles.step}>
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
