"use client";

import { validateSchedule } from "@/lib/exposure/schedule";
import {
  ACTIVITIES,
  AGE_BANDS,
  SENSITIVITIES,
  type Activity,
  type ActivityWindow,
  type AgeBand,
  type HouseholdMember,
  type Sensitivity,
} from "@/lib/types";
import styles from "./MemberCard.module.css";

const COMMON_DURATIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 540, 600, 720, 840, 960] as const;

/** Props for the MemberCard editing component. */
export interface MemberCardProps {
  member: HouseholdMember;
  onUpdate: (updated: HouseholdMember) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

/**
 * Editable card for a household member: label, age band, respiratory/cardiovascular
 * sensitivities, and daily routine activity windows.
 */
export function MemberCard({ member, onUpdate, onRemove, canRemove }: MemberCardProps) {
  const problems = validateSchedule(member.windows);
  const totalMinutes = member.windows.reduce((sum, w) => sum + w.durationMinutes, 0);

  const toggleSensitivity = (s: Sensitivity) => {
    const exists = member.sensitivities.includes(s);
    const updated = exists ? member.sensitivities.filter((x) => x !== s) : [...member.sensitivities, s];
    onUpdate({ ...member, sensitivities: updated });
  };

  const updateWindow = (index: number, partial: Partial<ActivityWindow>) => {
    onUpdate({ ...member, windows: member.windows.map((w, i) => (i === index ? { ...w, ...partial } : w)) });
  };

  const addWindow = () => {
    const w: ActivityWindow = { activity: "rest_indoor", setting: "indoor", startHour: 18, durationMinutes: 120, room: "living", mask: false };
    onUpdate({ ...member, windows: [...member.windows, w] });
  };

  const removeWindow = (index: number) => {
    if (member.windows.length > 1) {
      onUpdate({ ...member, windows: member.windows.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{member.label}</h3>
        {canRemove && onRemove && (
          <button type="button" onClick={onRemove} className={`${styles.buttonSmall} ${styles.buttonDelete}`} aria-label={`Remove ${member.label}`}>
            Remove Person
          </button>
        )}
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.field}>
          <label htmlFor={`member-label-${member.id}`} className={styles.label}>Name / Label</label>
          <input
            id={`member-label-${member.id}`}
            type="text"
            value={member.label}
            onChange={(e) => onUpdate({ ...member, label: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={`member-age-${member.id}`} className={styles.label}>Age Band</label>
          <select
            id={`member-age-${member.id}`}
            value={member.ageBand}
            onChange={(e) => onUpdate({ ...member, ageBand: e.target.value as AgeBand })}
            className={styles.select}
          >
            {AGE_BANDS.map((b) => (
              <option key={b} value={b}>{b.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Health & Vulnerability Flags</span>
        <div className={styles.sensitivities}>
          {SENSITIVITIES.map((s) => (
            <label key={s} className={styles.checkboxLabel}>
              <input type="checkbox" checked={member.sensitivities.includes(s)} onChange={() => toggleSensitivity(s)} />
              <span>{s.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.windowsSection}>
        <div className={styles.header}>
          <span className={styles.label}>Daily Routine ({totalMinutes}m / 1440m)</span>
          <button type="button" onClick={addWindow} className={styles.buttonSmall}>+ Add Window</button>
        </div>

        {member.windows.map((w, idx) => (
          <div key={idx} className={styles.windowRow}>
            <select
              aria-label={`Activity for window ${idx + 1}`}
              value={w.activity}
              onChange={(e) => updateWindow(idx, {
                activity: e.target.value as Activity,
                setting: e.target.value.startsWith("commute_") ? "vehicle" : e.target.value.startsWith("outdoor_") ? "outdoor" : "indoor",
              })}
              className={styles.select}
            >
              {ACTIVITIES.map((act) => <option key={act} value={act}>{act.replace(/_/g, " ")}</option>)}
            </select>

            <select
              aria-label={`Start hour for window ${idx + 1}`}
              value={w.startHour}
              onChange={(e) => updateWindow(idx, { startHour: parseInt(e.target.value, 10) })}
              className={styles.select}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>
              ))}
            </select>

            <select
              aria-label={`Duration for window ${idx + 1}`}
              value={w.durationMinutes}
              onChange={(e) => updateWindow(idx, { durationMinutes: parseInt(e.target.value, 10) })}
              className={styles.select}
            >
              {COMMON_DURATIONS.map((m) => <option key={m} value={m}>{m / 60}h ({m}m)</option>)}
            </select>

            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={w.mask} onChange={(e) => updateWindow(idx, { mask: e.target.checked })} />
              <span>Mask</span>
            </label>

            {member.windows.length > 1 && (
              <button type="button" onClick={() => removeWindow(idx)} className={`${styles.buttonSmall} ${styles.buttonDelete}`} aria-label={`Delete window ${idx + 1}`}>
                ✕
              </button>
            )}
          </div>
        ))}

        {problems.length > 0 && <div className={styles.errorText} role="alert">{problems.join("; ")}</div>}
      </div>
    </div>
  );
}
