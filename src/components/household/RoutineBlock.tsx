"use client";

import { ACTIVITIES, type Activity, type ActivityWindow } from "@/lib/types";
import { IconCross } from "../ui/icons";
import { ACTIVITY_LABELS, formatClock, formatDuration, formatTimeOfDay } from "@/components/labels";
import styles from "./RoutineBlock.module.css";

const DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 540, 600, 720, 840, 960] as const;

const SETTING_LABELS: Record<ActivityWindow["setting"], string> = {
  indoor: "Indoors",
  outdoor: "Outdoors",
  vehicle: "Travelling",
};

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
  const n = index + 1;
  const start = w.startHour * 60;
  const durations = DURATIONS.includes(w.durationMinutes as (typeof DURATIONS)[number])
    ? DURATIONS
    : [...DURATIONS, w.durationMinutes].sort((a, b) => a - b);

  return (
    <li className={styles.block} data-setting={w.setting}>
      <div className={styles.top}>
        <p className={styles.time}>
          <span className={styles.dot} aria-hidden="true" />
          {formatTimeOfDay(start)} – {formatTimeOfDay(start + w.durationMinutes)}
          <span className={styles.setting}>{SETTING_LABELS[w.setting]}</span>
        </p>
        {canDelete && (
          <button type="button" onClick={onDelete} className={styles.delete} aria-label={`Delete block ${n}`}>
            <IconCross size={14} />
          </button>
        )}
      </div>

      <select
        aria-label={`Activity, block ${n}`}
        value={w.activity}
        onChange={(e) => {
          const activity = e.target.value as Activity;
          onChange({ activity, setting: settingFor(activity) });
        }}
        className={`${styles.select} ${styles.activity}`}
      >
        {ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
      </select>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Starts</span>
          <select
            aria-label={`Starts at, block ${n}`}
            value={w.startHour}
            onChange={(e) => onChange({ startHour: parseInt(e.target.value, 10) })}
            className={styles.select}
          >
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatClock(h)}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>For</span>
          <select
            aria-label={`Lasts, block ${n}`}
            value={w.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: parseInt(e.target.value, 10) })}
            className={styles.select}
          >
            {durations.map((m) => <option key={m} value={m}>{formatDuration(m)}</option>)}
          </select>
        </label>
        <label className={styles.mask}>
          <input type="checkbox" checked={w.mask} onChange={(e) => onChange({ mask: e.target.checked })} />
          <span>Mask on</span>
        </label>
      </div>
    </li>
  );
}
