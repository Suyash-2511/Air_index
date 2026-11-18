"use client";

import { useState } from "react";
import {
  CRITERIA_POLLUTANTS,
  getDominantPollutantInfo,
  getPollutantLimitRatio,
  POLLUTANT_INFO,
  type PollutantCode,
} from "@/lib/air/pollutants";
import type { HourlyAir } from "@/lib/types";
import styles from "./AirToday.module.css";

export interface AirTodayProps {
  air: HourlyAir;
}

function getCategoryColor(category?: string): string {
  const norm = (category ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  switch (norm) {
    case "good":
      return "var(--aqi-good)";
    case "satisfactory":
      return "var(--aqi-satisfactory)";
    case "moderate":
      return "var(--aqi-moderate)";
    case "poor":
      return "var(--aqi-poor)";
    case "verypoor":
      return "var(--aqi-very-poor)";
    case "severe":
      return "var(--aqi-severe)";
    default:
      return "var(--ink-2)";
  }
}

export function AirToday({ air }: AirTodayProps) {
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
      case "pm25":
        return air.pm25;
      case "pm10":
        return air.pm10;
      case "no2":
        return air.no2;
      case "o3":
        return air.o3;
      case "co":
        return air.co;
      case "so2":
        return air.so2;
    }
  };

  return (
    <section className={styles.card} aria-labelledby="air-today-heading">
      <div className={styles.header}>
        <div>
          <p className={styles.kicker} id="air-today-heading">Air Quality Index · Current conditions</p>
          <div className={styles.aqiRow}>
            <span className={styles.aqiFigure}>{aqiVal !== undefined ? aqiVal : "—"}</span>
            <span className={styles.aqiLabel}>CPCB NAQI</span>
            <span
              className={styles.badge}
              style={{ color: getCategoryColor(category), borderColor: getCategoryColor(category) }}
            >
              <span className={styles.badgeDot} />
              {category}
            </span>
          </div>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span>Dominant pollutant:</span>
            <span className={styles.metaEmphasis}>{dominantInfo.label} ({dominantInfo.name})</span>
          </div>
          <div className={styles.metaItem}>
            <span>Source:</span>
            <span className={styles.metaEmphasis}>
              {aqi?.source === "cpcb" ? "CPCB via Google Air Quality" : "CPCB scale (computed from hourly readings)"}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid} role="region" aria-label="Criteria pollutants breakdown">
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
                aria-label={`${info.label}: ${val !== undefined ? `${val} ${info.unit}` : "No reading"}, ${ratio > 0 ? `${ratio} times national limit` : "within limit"}. Toggle health details.`}
              >
                <span className={styles.pollutantLabel}>{info.label}</span>

                <div className={styles.barCol} aria-hidden="true">
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${ratio > 1 ? styles.barExceeded : styles.barSafe}`}
                      style={{ width: `${val !== undefined ? Math.max(4, barPct) : 0}%` }}
                    />
                  </div>
                </div>

                <span className={styles.valueCol}>
                  {val !== undefined ? `${val} ${info.unit}` : "—"}
                </span>

                <span className={`${styles.ratioCol} ${ratio > 1 ? styles.ratioHigh : ""}`}>
                  {val !== undefined && ratio > 0 ? `${ratio}× limit` : "Within limit"}
                </span>

                <span
                  className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </button>

              {isExpanded && (
                <div id={detailId} className={styles.details}>
                  <div className={styles.detailsBlock}>
                    <span className={styles.detailsHeading}>Standard</span>
                    <span>National limit: {info.nationalLimit} {info.unit} ({info.limitPeriod} standard)</span>
                  </div>
                  <div className={styles.detailsBlock}>
                    <span className={styles.detailsHeading}>Health effect</span>
                    <span>{info.healthEffect}</span>
                  </div>
                  <div className={styles.detailsBlock}>
                    <span className={styles.detailsHeading}>Common sources</span>
                    <span>{info.sources}</span>
                  </div>
                  <div className={styles.detailsBlock}>
                    <span className={styles.detailsHeading}>At-risk groups</span>
                    <span>{info.atRisk}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.disclaimer}>
        Your dose below is based on PM2.5, the pollutant with the strongest evidence for breathing harm.
      </p>
    </section>
  );
}
