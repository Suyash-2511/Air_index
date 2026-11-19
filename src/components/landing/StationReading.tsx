"use client";

import styles from "./StationReading.module.css";
import { useCountUp } from "@/hooks";
import { useLocale } from "@/hooks";
import { getAqiCategoryKey } from "@/lib/air/client";

/** WHO 2021 air quality guideline for 24-hour mean PM2.5, in µg/m³. */
const WHO_DAILY_GUIDELINE = 15;
/** From this many times the guideline, a whole number reads better than one decimal. */
const WHOLE_RATIO_FROM = 10;

type Translate = ReturnType<typeof useLocale>["t"];

interface StationReadingProps {
  /** Live outdoor PM2.5; undefined while loading or when air data is unavailable. */
  livePm25?: number | undefined;
  cityName: string;
  isLive?: boolean;
  aqi?: { value: number; category: string } | undefined;
}

/** How the reading compares with the WHO daily guideline, in words. */
function guidelineText(reading: number | undefined, t: Translate): string {
  if (reading === undefined) return t("station_reading_loading");
  const ratio = reading / WHO_DAILY_GUIDELINE;
  if (ratio < 1) return t("station_who_within");
  return t("station_who_ratio", { ratio: ratio >= WHOLE_RATIO_FROM ? Math.round(ratio) : ratio.toFixed(1) });
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
  const statusLabel =
    reading === undefined
      ? t("station_status_loading", { city: cityName })
      : t("station_status_loaded", { city: cityName, reading, aqi: aqiText });

  return (
    <div className={styles.reading} role="status" aria-label={statusLabel}>
      <div className={styles.figure} aria-hidden="true">
        <span className={styles.number}>{shown ?? "--"}</span>
        <span className={styles.unit}>µg/m³</span>
      </div>
      <div className={styles.facts} aria-hidden="true">
        <span className={styles.label}>{isLive ? t("station_label_live") : t("station_label_city")}</span>
        <span className={styles.city}>{cityName}</span>
        {aqi && <span className={styles.aqiPill}>{t("station_aqi_pill", { val: Math.round(aqi.value), category: aqiCategory })}</span>}
        <span className={styles.note}>{guidelineText(reading, t)}</span>
      </div>
    </div>
  );
}
