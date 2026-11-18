"use client";

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
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Home and ventilation</h3>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="window-habit-select" className={styles.label}>
            Window Habit
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
            <option value="kept_closed">Kept closed mostly</option>
            <option value="open_sometimes">Open sometimes</option>
            <option value="open_often">Open often</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="cooking-fuel-select" className={styles.label}>
            Primary Cooking Fuel
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
            <option value="lpg">LPG Cylinder</option>
            <option value="piped_gas">Piped Natural Gas (PNG)</option>
            <option value="electric">Electric / Induction</option>
            <option value="kerosene">Kerosene</option>
            <option value="biomass">Biomass / Wood</option>
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
            <span>Air purifier in home</span>
          </label>

          {home.hasPurifier && (
            <select
              aria-label="Purifier location room"
              value={home.purifierRoom}
              onChange={(e) =>
                onChange({ ...home, purifierRoom: e.target.value as "living" | "bedroom" })
              }
              className={styles.select}
            >
              <option value="living">Located in living room</option>
              <option value="bedroom">Located in bedroom</option>
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
            <span>Kitchen exhaust fan / chimney</span>
          </label>

          <label className={styles.checkboxGroup}>
            <input
              type="checkbox"
              checked={home.smokingIndoors}
              onChange={(e) => onChange({ ...home, smokingIndoors: e.target.checked })}
              className={styles.checkbox}
            />
            <span>Smoking indoors</span>
          </label>
        </div>
      </div>
    </div>
  );
}
