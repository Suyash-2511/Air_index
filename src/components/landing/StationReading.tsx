"use client";

import styles from "./StationReading.module.css";
import { useCountUp } from "@/hooks/useCountUp";
import { useLocale } from "@/hooks/useLocale";
import { getAqiCategoryKey } from "@/lib/air/pollutants";

/** WHO 2021 air quality guideline for 24-hour mean PM2.5, in µg/m³. */
const WHO_DAILY_GUIDELINE = 15;

export interface StationReadingProps {
  /** Live outdoor PM2.5; undefined while loading or when air data is unavailable. */
  livePm25?: number | undefined;
  cityName: string;
  isLive?: boolean;
  aqi?: { value: number; category: string } | undefined;
}

/**
 * The station reading: today's outdoor PM2.5 and AQI as the bulletin's lead figure.
 * A number is only shown once it has really loaded, never as a placeholder.
 */
export function StationReading({ livePm25, cityName, isLive = false, aqi }: StationReadingProps) {
  const { t } = useLocale();
  const reading = livePm25 === undefined ? undefined : Math.round(livePm25);
  const shown = useCountUp(reading, { delay: 850, duration: 1500 });

  const aqiCategory = aqi ? t(getAqiCategoryKey(aqi.category)) : "";
  const aqiText = aqi ? `, AQI ${Math.round(aqi.value)} ${aqiCategory}` : "";

  const guidelineText = reading !== undefined
    ? (reading / WHO_DAILY_GUIDELINE < 1
      ? t("station_who_within")
      : t("station_who_ratio", {
          ratio: (reading / WHO_DAILY_GUIDELINE) >= 10
            ? Math.round(reading / WHO_DAILY_GUIDELINE)
            : (reading / WHO_DAILY_GUIDELINE).toFixed(1),
        }))
    : t("station_reading_loading");

  return (
    <div
      className={styles.reading}
      role="status"
      aria-label={
        reading !== undefined
          ? t("station_status_loaded", { city: cityName, reading, aqi: aqiText })
          : t("station_status_loading", { city: cityName })
      }
    >
      <div className={styles.figure} aria-hidden="true">
        <span className={styles.number}>{shown ?? "--"}</span>
        <span className={styles.unit}>µg/m³</span>
      </div>
      <div className={styles.facts} aria-hidden="true">
        <span className={styles.label}>
          {isLive ? t("station_label_live") : t("station_label_city")}
        </span>
        <span className={styles.city}>{cityName}</span>
        {aqi && (
          <span className={styles.aqiPill}>
            {t("station_aqi_pill", { val: Math.round(aqi.value), category: aqiCategory })}
          </span>
        )}
        <span className={styles.note}>{guidelineText}</span>
      </div>
    </div>
  );
}
