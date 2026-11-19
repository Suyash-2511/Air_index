"use client";

import { useLocale } from "@/hooks/useLocale";
import styles from "./InversionExplainer.module.css";

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
        <p className={styles.description}>
          {t("inversion_desc")}
        </p>
      </header>

      <div className={styles.diagramContainer}>
        <svg
          viewBox="0 0 600 160"
          className={styles.svg}
          role="img"
          aria-label={t("inversion_svg_aria")}
        >
          {/* Stage 1: Cold night */}
          <g transform="translate(10, 10)">
            <rect width="180" height="140" rx="6" fill="var(--sky-1)" stroke="var(--rule)" />
            <text x="90" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
              {t("inversion_stage1_title")}
            </text>
            <path d="M 20 120 Q 90 115 160 120" stroke="var(--rule-strong)" strokeWidth="2" fill="none" />
            <circle cx="90" cy="50" r="14" fill="var(--sky-2)" stroke="var(--rule)" />
            <path d="M 90 70 L 90 95" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeDasharray="3,3" />
            <polygon points="87,95 90,102 93,95" fill="var(--ink-secondary)" />
            <text x="90" y="112" textAnchor="middle" fontSize="10" fill="var(--ink-secondary)">
              {t("inversion_stage1_sub")}
            </text>
          </g>

          {/* Stage 2: Trapped layer */}
          <g transform="translate(210, 10)">
            <rect width="180" height="140" rx="6" fill="var(--sky-1)" stroke="var(--rule)" />
            <text x="90" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
              {t("inversion_stage2_title")}
            </text>
            {/* Warmer air lid */}
            <rect x="20" y="42" width="140" height="20" rx="3" fill="rgba(230, 81, 0, 0.15)" stroke="rgba(230, 81, 0, 0.4)" />
            <text x="90" y="56" textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--ink)">
              {t("inversion_stage2_lid")}
            </text>
            {/* Trapped ground smoke */}
            <rect x="20" y="70" width="140" height="50" rx="3" fill="var(--smog-soft)" />
            <circle cx="45" cy="85" r="4" fill="var(--smog-deep)" opacity="0.6" />
            <circle cx="70" cy="100" r="6" fill="var(--smog-deep)" opacity="0.7" />
            <circle cx="110" cy="88" r="5" fill="var(--smog-deep)" opacity="0.7" />
            <circle cx="140" cy="102" r="4" fill="var(--smog-deep)" opacity="0.6" />
            <text x="90" y="110" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ink)">
              {t("inversion_stage2_smog")}
            </text>
          </g>

          {/* Stage 3: Sun lifts it */}
          <g transform="translate(410, 10)">
            <rect width="180" height="140" rx="6" fill="var(--sky-1)" stroke="var(--rule)" />
            <text x="90" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
              {t("inversion_stage3_title")}
            </text>
            {/* Sun icon */}
            <circle cx="90" cy="48" r="10" fill="#f57c00" />
            {/* Rising thermal plumes */}
            <path d="M 45 110 Q 55 80 45 65" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <polygon points="42,65 45,58 48,65" fill="var(--ink-secondary)" />
            <path d="M 90 110 Q 100 85 90 70" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <polygon points="87,70 90,63 93,70" fill="var(--ink-secondary)" />
            <path d="M 135 110 Q 145 80 135 65" stroke="var(--ink-secondary)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <polygon points="132,65 135,58 138,65" fill="var(--ink-secondary)" />
            <text x="90" y="125" textAnchor="middle" fontSize="10" fill="var(--ink)">
              {t("inversion_stage3_sub")}
            </text>
          </g>
        </svg>

        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <span className={styles.stepNum}>{t("inversion_step1_label")}</span>
            <strong className={styles.stepTitle}>{t("inversion_step1_heading")}</strong>
            <p className={styles.stepText}>
              {t("inversion_step1_text")}
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>{t("inversion_step2_label")}</span>
            <strong className={styles.stepTitle}>{t("inversion_step2_heading")}</strong>
            <p className={styles.stepText}>
              {t("inversion_step2_text")}
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>{t("inversion_step3_label")}</span>
            <strong className={styles.stepTitle}>{t("inversion_step3_heading")}</strong>
            <p className={styles.stepText}>
              {t("inversion_step3_text")}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
