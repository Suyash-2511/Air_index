"use client";

import { useLocale } from "@/hooks";
import { formatClock, formatDuration, formatTimeOfDay } from "@/lib/format";
import { getActivityLabel } from "@/lib/labels";
import { HOURS_PER_DAY, MINUTES_PER_HOUR } from "@/lib/time-units";
import { ACTIVITIES, type Activity, type ActivityWindow } from "@/lib/types";
import { IconCross } from "../ui";
import { Select } from "../ui";
import styles from "./RoutineBlock.module.css";

/** The lengths offered for a block, from half an hour to sixteen hours. */
const DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 540, 600, 720, 840, 960];

const HOUR_OPTIONS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({ value: hour, label: formatClock(hour) }));

const SETTING_KEYS: Record<ActivityWindow["setting"], string> = {
  indoor: "setting_indoor",
  outdoor: "setting_outdoor",
  vehicle: "setting_vehicle",
};

/** Where an activity happens decides how much outdoor smog reaches the person. */
export function settingFor(activity: Activity): ActivityWindow["setting"] {
  if (activity.startsWith("commute_vehicle")) return "vehicle";
  if (activity.startsWith("commute_") || activity.startsWith("outdoor_")) return "outdoor";
  return "indoor";
}

/** Props for one editable block of a person's day. */
interface RoutineBlockProps {
  index: number;
  window: ActivityWindow;
  canDelete: boolean;
  onChange: (partial: Partial<ActivityWindow>) => void;
  onDelete: () => void;
}

/** The standard lengths, plus this block's own when it is not one of them (for example from a read sentence). */
function durationsIncluding(minutes: number): number[] {
  return DURATIONS.includes(minutes) ? DURATIONS : [...DURATIONS, minutes].sort((a, b) => a - b);
}

/**
 * One block of the day: when it starts and ends, what the person is doing, and
 * whether they wear a mask. The left edge is coloured by setting, so outdoor
 * time (where most of the dose comes from) stands out at a glance.
 */
export function RoutineBlock({ index, window: block, canDelete, onChange, onDelete }: RoutineBlockProps) {
  const { locale, t } = useLocale();
  const n = index + 1;
  const startMinute = block.startHour * MINUTES_PER_HOUR;
  const activityOptions = ACTIVITIES.map((activity) => ({ value: activity, label: getActivityLabel(activity, locale) }));
  const durationOptions = durationsIncluding(block.durationMinutes).map((minutes) => ({ value: minutes, label: formatDuration(minutes) }));

  return (
    <li className={styles.block} data-setting={block.setting}>
      <div className={styles.top}>
        <p className={styles.time}>
          <span className={styles.dot} aria-hidden="true" />
          {formatTimeOfDay(startMinute)} – {formatTimeOfDay(startMinute + block.durationMinutes)}
          <span className={styles.setting}>{t(SETTING_KEYS[block.setting])}</span>
        </p>
        {canDelete && (
          <button type="button" onClick={onDelete} className={styles.delete} aria-label={t("block_delete_aria", { n })}>
            <IconCross size={14} />
          </button>
        )}
      </div>

      <Select
        ariaLabel={t("block_activity_aria", { n })}
        value={block.activity}
        options={activityOptions}
        onChange={(activity) => onChange({ activity, setting: settingFor(activity) })}
        className={`${styles.select} ${styles.activity}`}
      />

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("block_starts_label")}</span>
          <Select ariaLabel={t("block_starts_aria", { n })} value={block.startHour} options={HOUR_OPTIONS} onChange={(startHour) => onChange({ startHour })} className={styles.select} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("block_duration_label")}</span>
          <Select ariaLabel={t("block_duration_aria", { n })} value={block.durationMinutes} options={durationOptions} onChange={(durationMinutes) => onChange({ durationMinutes })} className={styles.select} />
        </label>
        <label className={styles.mask}>
          <input type="checkbox" checked={block.mask} onChange={(event) => onChange({ mask: event.target.checked })} />
          <span>{t("block_mask_on")}</span>
        </label>
      </div>
    </li>
  );
}
