"use client";

import { useState, type CSSProperties } from "react";
import { useLocale } from "@/hooks/useLocale";
import {
  CRITERIA_POLLUTANTS,
  getAqiCategoryKey,
  getDominantPollutantInfo,
  getPollutantLimitRatio,
  POLLUTANT_INFO,
  type PollutantCode,
} from "@/lib/air/pollutants";
import type { HourlyAir } from "@/lib/types";
import { InversionExplainer } from "./InversionExplainer";
import styles from "./AirToday.module.css";
import headerStyles from "./AirTodayHeader.module.css";
import detailsStyles from "./AirTodayDetails.module.css";

/** Props for the AirToday multi-pollutant dashboard card. */
export interface AirTodayProps {
  air: HourlyAir;
}

/**
 * Displays CPCB NAQI current air quality reading, dominant pollutant,
 * and expandable breakdown of the six criteria pollutants.
 */
export function AirToday({ air }: AirTodayProps) {
  const { t } = useLocale();
  const [expandedRow, setExpandedRow] = useState<PollutantCode | null>(null);

  const aqi = air.aqi;
  const aqiVal = aqi?.value !== undefined ? Math.round(aqi.value) : undefined;
  const category = aqi?.category ?? "Moderate";
  const dominantInfo = getDominantPollutantInfo(aqi?.dominantPollutant);

  const toggleRow = (code: PollutantCode) => {
    setExpandedRow((prev) => (prev === code ? null : code));
  };

  const getConcentration = (code: PollutantCode): number | undefined => {
    switch (code) {
      case "pm25": return air.pm25;
      case "pm10": return air.pm10;
      case "no2": return air.no2;
      case "o3": return air.o3;
      case "co": return air.co;
      case "so2": return air.so2;
    }
  };

  return (
    <section className={styles.card} aria-labelledby="air-today-heading">
      <div className={headerStyles.header}>
        <div>
          <p className={headerStyles.kicker} id="air-today-heading">{t("air_today_kicker")}</p>
          <div className={headerStyles.aqiRow}>
            <span className={headerStyles.aqiFigure}>{aqiVal !== undefined ? aqiVal : "—"}</span>
            <span className={headerStyles.aqiLabel}>{t("air_today_cpcb_label")}</span>
            <span
              className={headerStyles.badge}
              data-category={(category ?? "").toLowerCase().replace(/[\s_-]+/g, "")}
            >
              <span className={headerStyles.badgeDot} />
              {t(getAqiCategoryKey(category))}
            </span>
          </div>
        </div>

        <div className={headerStyles.metaRow}>
          <div className={headerStyles.metaItem}>
            <span>{t("air_today_dominant_label")}</span>
            <span className={headerStyles.metaEmphasis}>{dominantInfo.label} ({t(dominantInfo.nameKey)})</span>
          </div>
          <div className={headerStyles.metaItem}>
            <span>{t("air_today_source_label")}</span>
            <span className={headerStyles.metaEmphasis}>
              {aqi?.source === "cpcb" ? t("air_today_source_google") : t("air_today_source_computed")}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid} role="region" aria-label={t("air_today_region_aria")}>
        {CRITERIA_POLLUTANTS.map((code) => {
          const info = POLLUTANT_INFO[code];
          const val = getConcentration(code);
          const ratio = val !== undefined ? getPollutantLimitRatio(code, val) : 0;
          const isExpanded = expandedRow === code;
          const barPct = Math.min(100, Math.round((ratio / 2.5) * 100));
          const detailId = `pollutant-detail-${code}`;

          return (
            <div key={code} className={styles.row}>
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => toggleRow(code)}
                aria-expanded={isExpanded}
                aria-controls={detailId}
                aria-label={`${info.label}: ${val !== undefined ? `${val} ${info.unit}` : t("no_reading")}, ${ratio > 0 ? t("ratio_times_limit", { ratio }) : t("within_limit")}. Toggle health details.`}
              >
                <span className={styles.pollutantLabel}>{info.label}</span>

                <div className={styles.barCol} aria-hidden="true">
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${ratio > 1 ? styles.barExceeded : styles.barSafe}`}
                      style={{ "--w": `${val !== undefined ? Math.max(4, barPct) : 0}%` } as CSSProperties}
                    />
                  </div>
                </div>

                <span className={styles.valueCol}>
                  {val !== undefined ? `${val} ${info.unit}` : "—"}
                </span>

                <span className={`${styles.ratioCol} ${ratio > 1 ? styles.ratioHigh : ""}`}>
                  {val !== undefined && ratio > 0 ? t("air_today_ratio_limit", { ratio }) : t("air_today_within_limit")}
                </span>

                <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`} aria-hidden="true">
                  ▼
                </span>
              </button>

              {isExpanded && (
                <div id={detailId} className={detailsStyles.details}>
                  <div className={detailsStyles.detailsBlock}>
                    <span className={detailsStyles.detailsHeading}>{t("pollutant_heading_standard")}</span>
                    <span>{t("pollutant_standard_text", { limit: info.nationalLimit, unit: info.unit, period: info.limitPeriod })}</span>
                  </div>
                  <div className={detailsStyles.detailsBlock}>
                    <span className={detailsStyles.detailsHeading}>{t("pollutant_heading_health")}</span>
                    <span>{t(info.healthEffectKey)}</span>
                  </div>
                  <div className={detailsStyles.detailsBlock}>
                    <span className={detailsStyles.detailsHeading}>{t("pollutant_heading_sources")}</span>
                    <span>{t(info.sourcesKey)}</span>
                  </div>
                  <div className={detailsStyles.detailsBlock}>
                    <span className={detailsStyles.detailsHeading}>{t("pollutant_heading_at_risk")}</span>
                    <span>{t(info.atRiskKey)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <InversionExplainer />

      <p className={detailsStyles.disclaimer}>
        {t("air_today_disclaimer")}
      </p>
    </section>
  );
}
