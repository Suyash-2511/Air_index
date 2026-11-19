"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { calculatePurifierSizing } from "@/lib/indoor/cadr";
import type { HomeSetup } from "@/lib/types";
import styles from "./PurifierCalculator.module.css";

/** Props for the PurifierCalculator room sizing tool. */
export interface PurifierCalculatorProps {
  outdoorPm25: number;
  windowHabit?: HomeSetup["windowHabit"];
}

const PRESETS = [
  { id: "bedroom", labelKey: "room_preset_bedroom", defaultLabel: "Bedroom", l: 3.0, w: 3.5, h: 2.8 },
  { id: "living", labelKey: "room_preset_living", defaultLabel: "Living room", l: 4.0, w: 5.0, h: 2.8 },
  { id: "study", labelKey: "room_preset_study", defaultLabel: "Study", l: 3.0, w: 3.0, h: 2.8 },
] as const;

/**
 * Interactive room sizing calculator determining required CADR and predicted indoor PM2.5.
 */
export function PurifierCalculator({ outdoorPm25, windowHabit = "kept_closed" }: PurifierCalculatorProps) {
  const { t } = useLocale();
  const [activePreset, setActivePreset] = useState<string>("bedroom");
  const [lengthM, setLengthM] = useState(3.0);
  const [widthM, setWidthM] = useState(3.5);
  const [heightM, setHeightM] = useState(2.8);
  const [targetAch, setTargetAch] = useState(4.8);

  const lengthId = useId();
  const widthId = useId();
  const heightId = useId();
  const achId = useId();

  const handleApplyPreset = (p: (typeof PRESETS)[number]) => {
    setActivePreset(p.id);
    setLengthM(p.l);
    setWidthM(p.w);
    setHeightM(p.h);
  };

  const result = useMemo(() => {
    return calculatePurifierSizing({
      room: { lengthM, widthM, heightM },
      targetAch,
      outdoorPm25,
      windowHabit,
    });
  }, [lengthM, widthM, heightM, targetAch, outdoorPm25, windowHabit]);

  return (
    <section className={styles.calculator} aria-labelledby="purifier-calc-title">
      <header>
        <h3 id="purifier-calc-title" className={styles.title}>{t("cadr_title")}</h3>
        <p className={styles.subtitle}>{t("cadr_subtitle")}</p>
      </header>

      <div className={styles.presetGroup} role="group" aria-label={t("cadr_presets_aria")}>
        <span className={styles.presetLabel}>{t("cadr_presets_label")}</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.presetButton}
            data-active={activePreset === p.id}
            onClick={() => handleApplyPreset(p)}
          >
            {t(p.labelKey)} ({p.l}×{p.w} m)
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={lengthId} className={styles.label}>{t("cadr_length_label")}</label>
          <input
            id={lengthId}
            type="number"
            min={1}
            max={15}
            step={0.1}
            value={lengthM}
            onChange={(e) => {
              setActivePreset("custom");
              setLengthM(parseFloat(e.target.value) || 1);
            }}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={widthId} className={styles.label}>{t("cadr_width_label")}</label>
          <input
            id={widthId}
            type="number"
            min={1}
            max={15}
            step={0.1}
            value={widthM}
            onChange={(e) => {
              setActivePreset("custom");
              setWidthM(parseFloat(e.target.value) || 1);
            }}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={heightId} className={styles.label}>{t("cadr_height_label")}</label>
          <input
            id={heightId}
            type="number"
            min={2}
            max={5}
            step={0.1}
            value={heightM}
            onChange={(e) => {
              setActivePreset("custom");
              setHeightM(parseFloat(e.target.value) || 2);
            }}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={achId} className={styles.label}>{t("cadr_ach_label")}</label>
          <select
            id={achId}
            value={targetAch}
            onChange={(e) => setTargetAch(parseFloat(e.target.value))}
            className={styles.select}
          >
            <option value={4.8}>{t("cadr_ach_smog")}</option>
            <option value={2.0}>{t("cadr_ach_normal")}</option>
          </select>
        </div>
      </div>

      <div className={styles.resultBox} aria-live="polite">
        <p className={styles.resultTitle}>
          {t("cadr_result_need", { m3h: result.cadrM3h, cfm: result.cadrCfm })}
        </p>
        <p className={styles.resultDetail}>
          {t("cadr_result_detail", {
            outdoor: outdoorPm25,
            without: result.indoorWithout,
            with: result.indoorWith,
            min: result.minutesToClean,
          })}
        </p>
      </div>
    </section>
  );
}
