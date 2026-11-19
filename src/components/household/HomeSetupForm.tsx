"use client";

import { useLocale } from "@/hooks";
import type { CookingFuel, HomeSetup, WindowHabit } from "@/lib/types";
import { Select } from "../ui";
import styles from "./HomeSetupForm.module.css";

/** Props for the HomeSetup configuration form. */
interface HomeSetupFormProps {
  home: HomeSetup;
  onChange: (updated: HomeSetup) => void;
}

const WINDOW_HABIT_OPTIONS: readonly { value: WindowHabit; labelKey: string }[] = [
  { value: "kept_closed", labelKey: "window_habit_kept_closed" },
  { value: "open_sometimes", labelKey: "window_habit_open_sometimes" },
  { value: "open_often", labelKey: "window_habit_open_often" },
];

const COOKING_FUEL_OPTIONS: readonly { value: CookingFuel; labelKey: string }[] = [
  { value: "lpg", labelKey: "cooking_fuel_lpg" },
  { value: "piped_gas", labelKey: "cooking_fuel_piped_gas" },
  { value: "electric", labelKey: "cooking_fuel_electric" },
  { value: "kerosene", labelKey: "cooking_fuel_kerosene" },
  { value: "biomass", labelKey: "cooking_fuel_biomass" },
];

const PURIFIER_ROOM_OPTIONS: readonly { value: HomeSetup["purifierRoom"]; labelKey: string }[] = [
  { value: "living", labelKey: "purifier_room_living" },
  { value: "bedroom", labelKey: "purifier_room_bedroom" },
];

interface CheckboxProps {
  checked: boolean;
  label: string;
  onChange: (isChecked: boolean) => void;
}

function CheckboxField({ checked, label, onChange }: CheckboxProps) {
  return (
    <label className={styles.checkboxGroup}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className={styles.checkbox} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Editable form component for home characteristics that determine outdoor infiltration
 * and indoor source generation (cooking fuel, exhaust, purifier, window habits).
 */
export function HomeSetupForm({ home, onChange }: HomeSetupFormProps) {
  const { t } = useLocale();
  const labelled = <T extends string>(options: readonly { value: T; labelKey: string }[]) =>
    options.map(({ value, labelKey }) => ({ value, label: t(labelKey) }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t("home_setup_title")}</h3>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="window-habit-select" className={styles.label}>
            {t("home_windows_label")}
          </label>
          <Select
            id="window-habit-select"
            value={home.windowHabit}
            options={labelled(WINDOW_HABIT_OPTIONS)}
            onChange={(windowHabit) => onChange({ ...home, windowHabit })}
            className={styles.select}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="cooking-fuel-select" className={styles.label}>
            {t("home_cooking_fuel_label")}
          </label>
          <Select
            id="cooking-fuel-select"
            value={home.cookingFuel}
            options={labelled(COOKING_FUEL_OPTIONS)}
            onChange={(cookingFuel) => onChange({ ...home, cookingFuel })}
            className={styles.select}
          />
        </div>

        <div className={styles.field}>
          <CheckboxField checked={home.hasPurifier} label={t("home_has_purifier")} onChange={(hasPurifier) => onChange({ ...home, hasPurifier })} />
          {home.hasPurifier && (
            <Select
              ariaLabel={t("home_purifier_room_aria")}
              value={home.purifierRoom}
              options={labelled(PURIFIER_ROOM_OPTIONS)}
              onChange={(purifierRoom) => onChange({ ...home, purifierRoom })}
              className={styles.select}
            />
          )}
        </div>

        <div className={styles.field}>
          <CheckboxField checked={home.hasExhaustFan} label={t("home_has_exhaust")} onChange={(hasExhaustFan) => onChange({ ...home, hasExhaustFan })} />
          <CheckboxField checked={home.smokingIndoors} label={t("home_smoking_indoors")} onChange={(smokingIndoors) => onChange({ ...home, smokingIndoors })} />
        </div>
      </div>
    </div>
  );
}
