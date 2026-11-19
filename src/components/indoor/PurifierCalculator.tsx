"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "@/hooks";
import { calculatePurifierSizing, NORMAL_TARGET_ACH, SMOG_TARGET_ACH } from "@/lib/indoor";
import type { HomeSetup } from "@/lib/types";
import { Select } from "../ui";
import { NumberField } from "./NumberField";
import styles from "./PurifierCalculator.module.css";

/** Props for the PurifierCalculator room sizing tool. */
interface PurifierCalculatorProps {
  outdoorPm25: number;
  windowHabit?: HomeSetup["windowHabit"];
}

interface Room {
  lengthM: number;
  widthM: number;
  heightM: number;
}

type Preset = Room & { id: string; labelKey: string };

/** Typical Indian flat rooms, so most visitors can start from a preset instead of measuring. */
const PRESETS: readonly Preset[] = [
  { id: "bedroom", labelKey: "room_preset_bedroom", lengthM: 3.0, widthM: 3.5, heightM: 2.8 },
  { id: "living", labelKey: "room_preset_living", lengthM: 4.0, widthM: 5.0, heightM: 2.8 },
  { id: "study", labelKey: "room_preset_study", lengthM: 3.0, widthM: 3.0, heightM: 2.8 },
];
const CUSTOM_PRESET_ID = "custom";

const DIMENSION_LIMITS = { length: { min: 1, max: 15 }, width: { min: 1, max: 15 }, height: { min: 2, max: 5 } };

function PresetButtons({ activeId, onPick }: { activeId: string; onPick: (preset: Preset) => void }) {
  const { t } = useLocale();
  return (
    <div className={styles.presetGroup} role="group" aria-label={t("cadr_presets_aria")}>
      <span className={styles.presetLabel}>{t("cadr_presets_label")}</span>
      {PRESETS.map((preset) => (
        <button key={preset.id} type="button" className={styles.presetButton} data-active={activeId === preset.id} onClick={() => onPick(preset)}>
          {t(preset.labelKey)} ({preset.lengthM}×{preset.widthM} m)
        </button>
      ))}
    </div>
  );
}

/**
 * Interactive room sizing calculator determining required CADR and predicted indoor PM2.5.
 */
export function PurifierCalculator({ outdoorPm25, windowHabit = "kept_closed" }: PurifierCalculatorProps) {
  const { t } = useLocale();
  const [activePreset, setActivePreset] = useState("bedroom");
  const [room, setRoom] = useState<Room>(PRESETS[0] ?? { lengthM: 3, widthM: 3.5, heightM: 2.8 });
  const [targetAch, setTargetAch] = useState(SMOG_TARGET_ACH);
  const achId = useId();

  const editRoom = (change: Partial<Room>) => {
    setActivePreset(CUSTOM_PRESET_ID);
    setRoom((previous) => ({ ...previous, ...change }));
  };

  const pickPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setRoom({ lengthM: preset.lengthM, widthM: preset.widthM, heightM: preset.heightM });
  };

  const result = useMemo(
    () => calculatePurifierSizing({ room, targetAch, outdoorPm25, windowHabit }),
    [room, targetAch, outdoorPm25, windowHabit],
  );

  return (
    <section className={styles.calculator} aria-labelledby="purifier-calc-title">
      <header>
        <h3 id="purifier-calc-title" className={styles.title}>{t("cadr_title")}</h3>
        <p className={styles.subtitle}>{t("cadr_subtitle")}</p>
      </header>

      <PresetButtons activeId={activePreset} onPick={pickPreset} />

      <div className={styles.grid}>
        <NumberField label={t("cadr_length_label")} value={room.lengthM} {...DIMENSION_LIMITS.length} onChange={(lengthM) => editRoom({ lengthM })} />
        <NumberField label={t("cadr_width_label")} value={room.widthM} {...DIMENSION_LIMITS.width} onChange={(widthM) => editRoom({ widthM })} />
        <NumberField label={t("cadr_height_label")} value={room.heightM} {...DIMENSION_LIMITS.height} onChange={(heightM) => editRoom({ heightM })} />

        <div className={styles.field}>
          <label htmlFor={achId} className={styles.label}>{t("cadr_ach_label")}</label>
          <Select
            id={achId}
            value={targetAch}
            options={[
              { value: SMOG_TARGET_ACH, label: t("cadr_ach_smog") },
              { value: NORMAL_TARGET_ACH, label: t("cadr_ach_normal") },
            ]}
            onChange={setTargetAch}
            className={styles.select}
          />
        </div>
      </div>

      <div className={styles.resultBox} aria-live="polite">
        <p className={styles.resultTitle}>{t("cadr_result_need", { m3h: result.cadrM3h, cfm: result.cadrCfm })}</p>
        <p className={styles.resultDetail}>
          {t("cadr_result_detail", { outdoor: outdoorPm25, without: result.indoorWithout, with: result.indoorWith, min: result.minutesToClean })}
        </p>
      </div>
    </section>
  );
}
