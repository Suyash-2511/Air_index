"use client";

import type { CSSProperties } from "react";
import { validateSchedule } from "@/lib/exposure/schedule";
import { useLocale } from "@/hooks/useLocale";
import {
  AGE_BANDS,
  SENSITIVITIES,
  type ActivityWindow,
  type AgeBand,
  type HouseholdMember,
  type Sensitivity,
} from "@/lib/types";
import { getAgeBandLabel, getSensitivityLabel, formatDuration } from "@/components/labels";
import { RoutineBlock } from "./RoutineBlock";
import styles from "./MemberCard.module.css";

/** Props for the MemberCard editing component. */
export interface MemberCardProps {
  member: HouseholdMember;
  onUpdate: (updated: HouseholdMember) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

/** Starts a new block where the person's last block ends. */
function nextBlock(windows: readonly ActivityWindow[]): ActivityWindow {
  const last = windows[windows.length - 1];
  const end = last ? (last.startHour * 60 + last.durationMinutes) / 60 : 18;
  return { activity: "rest_indoor", setting: "indoor", startHour: Math.floor(end) % 24, durationMinutes: 60, room: "living", mask: false };
}

/**
 * Editable card for one person: name, age group, health conditions and the
 * blocks of their day, with a bar showing how much of 24 hours is planned.
 */
export function MemberCard({ member, onUpdate, onRemove, canRemove }: MemberCardProps) {
  const { locale, t } = useLocale();
  const problems = validateSchedule(member.windows, locale);
  const totalMinutes = member.windows.reduce((sum, w) => sum + w.durationMinutes, 0);
  const plannedPct = Math.min(100, (totalMinutes / 1440) * 100);
  const sortedIdx = member.windows.map((w, i) => ({ w, i })).sort((a, b) => a.w.startHour - b.w.startHour);

  const toggleSensitivity = (s: Sensitivity) => {
    const has = member.sensitivities.includes(s);
    onUpdate({ ...member, sensitivities: has ? member.sensitivities.filter((x) => x !== s) : [...member.sensitivities, s] });
  };

  const updateWindow = (index: number, partial: Partial<ActivityWindow>) => {
    onUpdate({ ...member, windows: member.windows.map((w, i) => (i === index ? { ...w, ...partial } : w)) });
  };

  const removeWindow = (index: number) => {
    if (member.windows.length > 1) onUpdate({ ...member, windows: member.windows.filter((_, i) => i !== index) });
  };

  return (
    <article className={styles.card} aria-labelledby={`member-title-${member.id}`}>
      <header className={styles.header}>
        <h3 id={`member-title-${member.id}`} className={styles.title}>{member.label || t("member_unnamed")}</h3>
        {canRemove && onRemove && (
          <button type="button" onClick={onRemove} className={styles.remove} aria-label={t("member_remove_aria", { name: member.label })}>
            {t("member_remove_btn")}
          </button>
        )}
      </header>

      <div className={styles.metaGrid}>
        <label className={styles.field}>
          <span className={styles.label}>{t("member_name_label")}</span>
          <input type="text" value={member.label} onChange={(e) => onUpdate({ ...member, label: e.target.value })} className={styles.input} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("member_age_label")}</span>
          <select value={member.ageBand} onChange={(e) => onUpdate({ ...member, ageBand: e.target.value as AgeBand })} className={styles.input}>
            {AGE_BANDS.map((b) => <option key={b} value={b}>{getAgeBandLabel(b, locale)}</option>)}
          </select>
        </label>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>{t("member_conditions_label")}</legend>
        <div className={styles.chips}>
          {SENSITIVITIES.map((s) => (
            <label key={s} className={styles.chip}>
              <input type="checkbox" checked={member.sensitivities.includes(s)} onChange={() => toggleSensitivity(s)} />
              <span>{getSensitivityLabel(s, locale)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.day} aria-label={t("member_day_aria", { name: member.label })}>
        <div className={styles.dayHead}>
          <span className={styles.label}>{t("member_typical_day")}</span>
          <span className={styles.planned} data-complete={totalMinutes === 1440}>
            {t("member_planned_duration", { duration: formatDuration(totalMinutes) })}
          </span>
        </div>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={t("member_progress_aria")}
          aria-valuemin={0}
          aria-valuemax={24}
          aria-valuenow={Math.round(totalMinutes / 60)}
        >
          <span style={{ "--scale": plannedPct / 100 } as CSSProperties} />
        </div>

        <ol className={styles.blocks}>
          {sortedIdx.map(({ w, i }) => (
            <RoutineBlock
              key={i}
              index={i}
              window={w}
              canDelete={member.windows.length > 1}
              onChange={(partial) => updateWindow(i, partial)}
              onDelete={() => removeWindow(i)}
            />
          ))}
        </ol>

        <button type="button" onClick={() => onUpdate({ ...member, windows: [...member.windows, nextBlock(member.windows)] })} className={styles.add}>
          {t("member_add_block")}
        </button>

        {problems.length > 0 && <p className={styles.errorText} role="alert">{problems.join(" ")}</p>}
      </section>
    </article>
  );
}
