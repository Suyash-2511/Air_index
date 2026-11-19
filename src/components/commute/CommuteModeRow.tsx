"use client";

import { useLocale } from "@/hooks";
import type { CommuteModeComparison } from "@/lib/commute";
import styles from "./CommuteCompare.module.css";

interface CommuteModeRowProps {
  comparison: CommuteModeComparison;
  isApplied: boolean;
  onUse: (comparison: CommuteModeComparison) => void;
}

/** One way of travelling: how long it takes, what it puts in the lungs and the air, and a button to adopt it. */
export function CommuteModeRow({ comparison, isApplied, onUse }: CommuteModeRowProps) {
  const { t } = useLocale();
  const modeLabel = t(comparison.labelKey);

  return (
    <tr className={styles.row} data-highlight={comparison.isBestForLungs || comparison.isBestForCity}>
      <th scope="row" className={styles.td}>
        {modeLabel}
        {comparison.isBestForLungs && <span className={styles.badgeLungs}>{t("commute_badge_lungs")}</span>}
        {comparison.isBestForCity && <span className={styles.badgeCity}>{t("commute_badge_city")}</span>}
      </th>
      <td className={styles.td}>{comparison.durationMin} {t("commute_min_unit")}</td>
      <td className={styles.td}>{comparison.inhaledMicrograms} {t("commute_ug_unit")}</td>
      <td className={styles.td}>{comparison.co2Grams} {t("commute_g_unit")}</td>
      <td className={styles.td}>
        <button
          type="button"
          className={styles.useBtn}
          data-active={isApplied}
          onClick={() => onUse(comparison)}
          aria-label={t("commute_btn_aria", { mode: modeLabel })}
        >
          {isApplied ? t("commute_btn_applied") : t("commute_btn_use")}
        </button>
      </td>
    </tr>
  );
}
