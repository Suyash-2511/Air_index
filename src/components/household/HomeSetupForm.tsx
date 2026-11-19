"use client";

import { useLocale } from "@/hooks/useLocale";
import type { COOKING_FUELS, HomeSetup, WINDOW_HABITS } from "@/lib/types";
import styles from "./HomeSetupForm.module.css";

/** Props for the HomeSetup configuration form. */
export interface HomeSetupFormProps {
  home: HomeSetup;
  onChange: (updated: HomeSetup) => void;
}

/**
 * Editable form component for home characteristics that determine outdoor infiltration
 * and indoor source generation (cooking fuel, exhaust, purifier, window habits).
 */
export function HomeSetupForm({ home, onChange }: HomeSetupFormProps) {
  const { t } = useLocale();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t("home_setup_title")}</h3>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="window-habit-select" className={styles.label}>
            {t("home_windows_label")}
          </label>
          <select
            id="window-habit-select"
            value={home.windowHabit}
            onChange={(e) =>
              onChange({
                ...home,
                windowHabit: e.target.value as (typeof WINDOW_HABITS)[number],
              })
            }
            className={styles.select}
          >
            <option value="kept_closed">{t("window_habit_kept_closed")}</option>
            <option value="open_sometimes">{t("window_habit_open_sometimes")}</option>
            <option value="open_often">{t("window_habit_open_often")}</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="cooking-fuel-select" className={styles.label}>
            {t("home_cooking_fuel_label")}
          </label>
          <select
            id="cooking-fuel-select"
            value={home.cookingFuel}
            onChange={(e) =>
              onChange({
                ...home,
                cookingFuel: e.target.value as (typeof COOKING_FUELS)[number],
              })
            }
            className={styles.select}
          >
            <option value="lpg">{t("cooking_fuel_lpg")}</option>
            <option value="piped_gas">{t("cooking_fuel_piped_gas")}</option>
            <option value="electric">{t("cooking_fuel_electric")}</option>
            <option value="kerosene">{t("cooking_fuel_kerosene")}</option>
            <option value="biomass">{t("cooking_fuel_biomass")}</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxGroup}>
            <input
              type="checkbox"
              checked={home.hasPurifier}
              onChange={(e) => onChange({ ...home, hasPurifier: e.target.checked })}
              className={styles.checkbox}
            />
            <span>{t("home_has_purifier")}</span>
          </label>

          {home.hasPurifier && (
            <select
              aria-label={t("home_purifier_room_aria")}
              value={home.purifierRoom}
              onChange={(e) =>
                onChange({ ...home, purifierRoom: e.target.value as "living" | "bedroom" })
              }
              className={styles.select}
            >
              <option value="living">{t("purifier_room_living")}</option>
              <option value="bedroom">{t("purifier_room_bedroom")}</option>
            </select>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxGroup}>
            <input
              type="checkbox"
              checked={home.hasExhaustFan}
              onChange={(e) => onChange({ ...home, hasExhaustFan: e.target.checked })}
              className={styles.checkbox}
            />
            <span>{t("home_has_exhaust")}</span>
          </label>

          <label className={styles.checkboxGroup}>
            <input
              type="checkbox"
              checked={home.smokingIndoors}
              onChange={(e) => onChange({ ...home, smokingIndoors: e.target.checked })}
              className={styles.checkbox}
            />
            <span>{t("home_smoking_indoors")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
