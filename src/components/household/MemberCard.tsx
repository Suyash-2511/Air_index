"use client";

import { useLocale } from "@/hooks";
import { validateSchedule } from "@/lib/exposure";
import { formatDuration } from "@/lib/format";
import { getAgeBandLabel, getSensitivityLabel } from "@/lib/labels";
import { HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR } from "@/lib/time-units";
import { AGE_BANDS, SENSITIVITIES, type ActivityWindow, type HouseholdMember, type Sensitivity } from "@/lib/types";
import { Select } from "../ui";
import { cssVars } from "../ui";
import styles from "./MemberCard.module.css";
import { RoutineBlock } from "./RoutineBlock";

/** Props for the MemberCard editing component. */
interface MemberCardProps {
  member: HouseholdMember;
  onUpdate: (updated: HouseholdMember) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

/** A new block starts at 6 PM when the day has no blocks yet, the usual end of a working day. */
const DEFAULT_NEW_BLOCK_START_HOUR = 18;
const NEW_BLOCK_MINUTES = 60;

/** Starts a new block where the person's last block ends. */
function nextBlock(windows: readonly ActivityWindow[]): ActivityWindow {
  const last = windows[windows.length - 1];
  const endHour = last ? (last.startHour * MINUTES_PER_HOUR + last.durationMinutes) / MINUTES_PER_HOUR : DEFAULT_NEW_BLOCK_START_HOUR;
  return {
    activity: "rest_indoor",
    setting: "indoor",
    startHour: Math.floor(endHour) % HOURS_PER_DAY,
    durationMinutes: NEW_BLOCK_MINUTES,
    room: "living",
    mask: false,
  };
}

/** Name and age group of the person. */
function MemberDetails({ member, onUpdate }: Pick<MemberCardProps, "member" | "onUpdate">) {
  const { locale, t } = useLocale();
  const ageOptions = AGE_BANDS.map((band) => ({ value: band, label: getAgeBandLabel(band, locale) }));
  return (
    <div className={styles.metaGrid}>
      <label className={styles.field}>
        <span className={styles.label}>{t("member_name_label")}</span>
        <input type="text" value={member.label} onChange={(event) => onUpdate({ ...member, label: event.target.value })} className={styles.input} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{t("member_age_label")}</span>
        <Select value={member.ageBand} options={ageOptions} onChange={(ageBand) => onUpdate({ ...member, ageBand })} className={styles.input} />
      </label>
    </div>
  );
}

/** Health conditions that raise the person's sensitivity to smoke. */
function ConditionChips({ member, onUpdate }: Pick<MemberCardProps, "member" | "onUpdate">) {
  const { locale, t } = useLocale();
  const toggle = (sensitivity: Sensitivity) => {
    const has = member.sensitivities.includes(sensitivity);
    onUpdate({ ...member, sensitivities: has ? member.sensitivities.filter((other) => other !== sensitivity) : [...member.sensitivities, sensitivity] });
  };
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.label}>{t("member_conditions_label")}</legend>
      <div className={styles.chips}>
        {SENSITIVITIES.map((sensitivity) => (
          <label key={sensitivity} className={styles.chip}>
            <input type="checkbox" checked={member.sensitivities.includes(sensitivity)} onChange={() => toggle(sensitivity)} />
            <span>{getSensitivityLabel(sensitivity, locale)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** How much of the 24 hours the blocks cover, as a bar and a label. */
function PlannedProgress({ totalMinutes }: { totalMinutes: number }) {
  const { t } = useLocale();
  const plannedFraction = Math.min(1, totalMinutes / MINUTES_PER_DAY);
  return (
    <>
      <div className={styles.dayHead}>
        <span className={styles.label}>{t("member_typical_day")}</span>
        <span className={styles.planned} data-complete={totalMinutes === MINUTES_PER_DAY}>
          {t("member_planned_duration", { duration: formatDuration(totalMinutes) })}
        </span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={t("member_progress_aria")}
        aria-valuemin={0}
        aria-valuemax={HOURS_PER_DAY}
        aria-valuenow={Math.round(totalMinutes / MINUTES_PER_HOUR)}
      >
        <span style={cssVars({ "--scale": plannedFraction })} />
      </div>
    </>
  );
}

/**
 * Editable card for one person: name, age group, health conditions and the
 * blocks of their day, with a bar showing how much of 24 hours is planned.
 */
export function MemberCard({ member, onUpdate, onRemove, canRemove }: MemberCardProps) {
  const { locale, t } = useLocale();
  const problems = validateSchedule(member.windows, locale);
  const totalMinutes = member.windows.reduce((sum, block) => sum + block.durationMinutes, 0);
  // Blocks are listed by start time, but edits address them by their position in the stored list.
  const byStart = member.windows.map((block, index) => ({ block, index })).sort((a, b) => a.block.startHour - b.block.startHour);
  const canDeleteBlock = member.windows.length > 1;

  const updateBlock = (index: number, partial: Partial<ActivityWindow>) =>
    onUpdate({ ...member, windows: member.windows.map((block, i) => (i === index ? { ...block, ...partial } : block)) });
  const removeBlock = (index: number) => {
    if (canDeleteBlock) onUpdate({ ...member, windows: member.windows.filter((_, i) => i !== index) });
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

      <MemberDetails member={member} onUpdate={onUpdate} />
      <ConditionChips member={member} onUpdate={onUpdate} />

      <section className={styles.day} aria-label={t("member_day_aria", { name: member.label })}>
        <PlannedProgress totalMinutes={totalMinutes} />

        <ol className={styles.blocks}>
          {byStart.map(({ block, index }) => (
            <RoutineBlock
              key={index}
              index={index}
              window={block}
              canDelete={canDeleteBlock}
              onChange={(partial) => updateBlock(index, partial)}
              onDelete={() => removeBlock(index)}
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
