"use client";

import type { CSSProperties } from "react";
import { IconArrowRight } from "./icons";
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
}

const STEPS = [
  { n: "01", text: "Choose your area" },
  { n: "02", text: "Describe who lives at home" },
  { n: "03", text: "Switch on changes and watch the dose fall" },
] as const;

/**
 * Landing introduction, set as the front page of a bulletin: a kicker, the headline,
 * today's station reading, and the two ways in.
 */
export function LandingHero({ onPlanHome, onSampleFamily, livePm25, cityName = "New Delhi", isLive = false }: LandingHeroProps) {
  return (
    <section className={styles.heroSection} aria-labelledby="landing-headline">
      <div className={styles.content}>
        <p className={styles.kicker}>Today&apos;s field note</p>

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

        <StationReading livePm25={livePm25} cityName={cityName} isLive={isLive} />

        <ol className={styles.steps} aria-label="How it works">
          {STEPS.map((s, i) => (
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
