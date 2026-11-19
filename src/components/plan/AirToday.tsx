"use client";

import { useLocale } from "@/hooks";
import { CRITERIA_POLLUTANTS, getAqiCategoryKey, getDominantPollutantInfo } from "@/lib/air/client";
import type { HourlyAir } from "@/lib/types";
import styles from "./AirToday.module.css";
import headerStyles from "./AirTodayHeader.module.css";
import detailsStyles from "./AirTodayDetails.module.css";
import { InversionExplainer } from "./InversionExplainer";
import { PollutantRow } from "./PollutantRow";

/** Props for the AirToday multi-pollutant dashboard card. */
interface AirTodayProps {
  air: HourlyAir;
}

/** The headline AQI figure with its category and where the number came from. */
function AqiHeader({ air }: AirTodayProps) {
  const { t } = useLocale();
  const { aqi } = air;
  const category = aqi?.category ?? "Moderate";
  const dominant = getDominantPollutantInfo(aqi?.dominantPollutant);

  return (
    <div className={headerStyles.header}>
      <div>
        <p className={headerStyles.kicker} id="air-today-heading">{t("air_today_kicker")}</p>
        <div className={headerStyles.aqiRow}>
          <span className={headerStyles.aqiFigure}>{aqi?.value !== undefined ? Math.round(aqi.value) : "—"}</span>
          <span className={headerStyles.aqiLabel}>{t("air_today_cpcb_label")}</span>
          <span className={headerStyles.badge} data-category={category.toLowerCase().replace(/[\s_-]+/g, "")}>
            <span className={headerStyles.badgeDot} />
            {t(getAqiCategoryKey(category))}
          </span>
        </div>
      </div>

      <div className={headerStyles.metaRow}>
        <div className={headerStyles.metaItem}>
          <span>{t("air_today_dominant_label")}</span>
          <span className={headerStyles.metaEmphasis}>{dominant.label} ({t(dominant.nameKey)})</span>
        </div>
        <div className={headerStyles.metaItem}>
          <span>{t("air_today_source_label")}</span>
          <span className={headerStyles.metaEmphasis}>
            {aqi?.source === "cpcb" ? t("air_today_source_google") : t("air_today_source_computed")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Displays CPCB NAQI current air quality reading, dominant pollutant,
 * and expandable breakdown of the six criteria pollutants.
 */
export function AirToday({ air }: AirTodayProps) {
  const { t } = useLocale();
  return (
    <section className={styles.card} aria-labelledby="air-today-heading">
      <AqiHeader air={air} />

      <div className={styles.grid} role="region" aria-label={t("air_today_region_aria")}>
        {CRITERIA_POLLUTANTS.map((code) => (
          <PollutantRow key={code} code={code} concentration={air[code]} />
        ))}
      </div>

      <InversionExplainer />

      <p className={detailsStyles.disclaimer}>{t("air_today_disclaimer")}</p>
    </section>
  );
}
