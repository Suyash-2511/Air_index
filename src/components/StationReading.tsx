"use client";

import styles from "./StationReading.module.css";
import { useCountUp } from "./useCountUp";

/** WHO 2021 air quality guideline for 24-hour mean PM2.5, in µg/m³. */
const WHO_DAILY_GUIDELINE = 15;

export interface StationReadingProps {
  /** Live outdoor PM2.5; undefined while loading or when air data is unavailable. */
  livePm25?: number | undefined;
  cityName: string;
  isLive?: boolean;
  aqi?: { value: number; category: string } | undefined;
}

function guidelineNote(pm25: number): string {
  const ratio = pm25 / WHO_DAILY_GUIDELINE;
  if (ratio < 1) return `Within the WHO 24-hour guideline of ${WHO_DAILY_GUIDELINE}`;
  return `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× the WHO 24-hour guideline`;
}

/**
 * The station reading: today's outdoor PM2.5 and AQI as the bulletin's lead figure.
 * A number is only shown once it has really loaded, never as a placeholder.
 */
export function StationReading({ livePm25, cityName, isLive = false, aqi }: StationReadingProps) {
  const reading = livePm25 === undefined ? undefined : Math.round(livePm25);
  const shown = useCountUp(reading, { delay: 850, duration: 1500 });
  const aqiText = aqi ? `, AQI ${Math.round(aqi.value)} ${aqi.category}` : "";

  return (
    <div
      className={styles.reading}
      role="status"
      aria-label={
        reading !== undefined
          ? `Outdoor air now in ${cityName}: PM2.5 ${reading} micrograms per cubic metre${aqiText}`
          : `Loading outdoor air for ${cityName}`
      }
    >
      <div className={styles.figure} aria-hidden="true">
        <span className={styles.number}>{shown ?? "--"}</span>
        <span className={styles.unit}>µg/m³</span>
      </div>
      <div className={styles.facts} aria-hidden="true">
        <span className={styles.label}>{isLive ? "PM2.5 where you are now" : "PM2.5 outdoors now"}</span>
        <span className={styles.city}>{cityName}</span>
        {aqi && (
          <span className={styles.aqiPill}>
            AQI {Math.round(aqi.value)} · {aqi.category}
          </span>
        )}
        <span className={styles.note}>
          {reading !== undefined ? guidelineNote(reading) : "Reading the air…"}
        </span>
      </div>
    </div>
  );
}
