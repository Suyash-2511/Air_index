"use client";

import { useState } from "react";
import { useLocale } from "@/hooks";
import { getPollutantLimitRatio, POLLUTANT_INFO, type PollutantCode } from "@/lib/air/client";
import { cssVars } from "../ui";
import styles from "./AirToday.module.css";
import detailsStyles from "./AirTodayDetails.module.css";

/** A bar is full at this many times the national limit, so a reading at the limit sits well short of the end. */
const BAR_FULL_AT_RATIO = 2.5;
/** Even a tiny reading gets a sliver of bar so it is visibly there. */
const MIN_BAR_PERCENT = 4;

interface PollutantRowProps {
  code: PollutantCode;
  /** The reading in the pollutant's own unit, or undefined when none was reported. */
  concentration: number | undefined;
}

/** The reading as a multiple of the national limit, and how much of the bar it fills; no reading means an empty bar. */
function measureAgainstLimit(code: PollutantCode, concentration: number | undefined) {
  if (concentration === undefined) return { ratio: 0, isOverLimit: false, barPercent: 0 };
  const ratio = getPollutantLimitRatio(code, concentration);
  const filled = Math.round((ratio / BAR_FULL_AT_RATIO) * 100);
  return { ratio, isOverLimit: ratio > 1, barPercent: Math.max(MIN_BAR_PERCENT, Math.min(100, filled)) };
}

/** The four paragraphs shown when a row is opened: the standard, the health effect, sources, and who is at risk. */
function PollutantDetails({ code, id }: { code: PollutantCode; id: string }) {
  const { t } = useLocale();
  const info = POLLUTANT_INFO[code];
  const blocks = [
    ["pollutant_heading_standard", t("pollutant_standard_text", { limit: info.nationalLimit, unit: info.unit, period: info.limitPeriod })],
    ["pollutant_heading_health", t(info.healthEffectKey)],
    ["pollutant_heading_sources", t(info.sourcesKey)],
    ["pollutant_heading_at_risk", t(info.atRiskKey)],
  ] as const;
  return (
    <div id={id} className={detailsStyles.details}>
      {blocks.map(([headingKey, text]) => (
        <div key={headingKey} className={detailsStyles.detailsBlock}>
          <span className={detailsStyles.detailsHeading}>{t(headingKey)}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

/** One pollutant: its reading, how that compares with the national limit, and a toggle for the health details. */
export function PollutantRow({ code, concentration }: PollutantRowProps) {
  const { t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const info = POLLUTANT_INFO[code];
  const { ratio, isOverLimit, barPercent } = measureAgainstLimit(code, concentration);
  const detailId = `pollutant-detail-${code}`;
  const reading = concentration === undefined ? undefined : `${concentration} ${info.unit}`;
  const limitText = ratio > 0 ? t("ratio_times_limit", { ratio }) : t("within_limit");

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.rowButton}
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={isExpanded}
        aria-controls={detailId}
        aria-label={`${info.label}: ${reading ?? t("no_reading")}, ${limitText}. Toggle health details.`}
      >
        <span className={styles.pollutantLabel}>{info.label}</span>

        <div className={styles.barCol} aria-hidden="true">
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${isOverLimit ? styles.barExceeded : styles.barSafe}`}
              style={cssVars({ "--w": `${barPercent}%` })}
            />
          </div>
        </div>

        <span className={styles.valueCol}>{reading ?? "—"}</span>

        <span className={`${styles.ratioCol} ${isOverLimit ? styles.ratioHigh : ""}`}>
          {ratio > 0 ? t("air_today_ratio_limit", { ratio }) : t("air_today_within_limit")}
        </span>

        <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`} aria-hidden="true">
          ▼
        </span>
      </button>

      {isExpanded && <PollutantDetails code={code} id={detailId} />}
    </div>
  );
}
