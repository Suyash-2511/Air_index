"use client";

import { ACTIVITIES, type Activity, type ActivityWindow } from "@/lib/types";
import { useLocale } from "@/hooks/useLocale";
import { IconCross } from "../ui/icons";
import { getActivityLabel, formatClock, formatDuration, formatTimeOfDay } from "@/components/labels";
import styles from "./RoutineBlock.module.css";

const DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 540, 600, 720, 840, 960] as const;

/** Where an activity happens decides how much outdoor smog reaches the person. */
export function settingFor(activity: Activity): ActivityWindow["setting"] {
  if (activity.startsWith("commute_vehicle")) return "vehicle";
  if (activity.startsWith("commute_") || activity.startsWith("outdoor_")) return "outdoor";
  return "indoor";
}

/** Props for one editable block of a person's day. */
export interface RoutineBlockProps {
  index: number;
  window: ActivityWindow;
  canDelete: boolean;
  onChange: (partial: Partial<ActivityWindow>) => void;
  onDelete: () => void;
}

/**
 * One block of the day: when it starts and ends, what the person is doing, and
 * whether they wear a mask. The left edge is coloured by setting, so outdoor
 * time (where most of the dose comes from) stands out at a glance.
 */
export function RoutineBlock({ index, window: w, canDelete, onChange, onDelete }: RoutineBlockProps) {
  const { locale, t } = useLocale();
  const n = index + 1;
  const start = w.startHour * 60;
  const durations = DURATIONS.includes(w.durationMinutes as (typeof DURATIONS)[number])
    ? DURATIONS
    : [...DURATIONS, w.durationMinutes].sort((a, b) => a - b);

  const settingLabel = w.setting === "indoor"
    ? t("setting_indoor")
    : w.setting === "outdoor"
      ? t("setting_outdoor")
      : t("setting_vehicle");

  return (
    <li className={styles.block} data-setting={w.setting}>
      <div className={styles.top}>
        <p className={styles.time}>
          <span className={styles.dot} aria-hidden="true" />
          {formatTimeOfDay(start)} – {formatTimeOfDay(start + w.durationMinutes)}
          <span className={styles.setting}>{settingLabel}</span>
        </p>
        {canDelete && (
          <button type="button" onClick={onDelete} className={styles.delete} aria-label={t("block_delete_aria", { n })}>
            <IconCross size={14} />
          </button>
        )}
      </div>

      <select
        aria-label={t("block_activity_aria", { n })}
        value={w.activity}
        onChange={(e) => {
          const activity = e.target.value as Activity;
          onChange({ activity, setting: settingFor(activity) });
        }}
        className={`${styles.select} ${styles.activity}`}
      >
        {ACTIVITIES.map((a) => <option key={a} value={a}>{getActivityLabel(a, locale)}</option>)}
      </select>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("block_starts_label")}</span>
          <select
            aria-label={t("block_starts_aria", { n })}
            value={w.startHour}
            onChange={(e) => onChange({ startHour: parseInt(e.target.value, 10) })}
            className={styles.select}
          >
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatClock(h)}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("block_duration_label")}</span>
          <select
            aria-label={t("block_duration_aria", { n })}
            value={w.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: parseInt(e.target.value, 10) })}
            className={styles.select}
          >
            {durations.map((m) => <option key={m} value={m}>{formatDuration(m)}</option>)}
          </select>
        </label>
        <label className={styles.mask}>
          <input type="checkbox" checked={w.mask} onChange={(e) => onChange({ mask: e.target.checked })} />
          <span>{t("block_mask_on")}</span>
        </label>
      </div>
    </li>
  );
}
