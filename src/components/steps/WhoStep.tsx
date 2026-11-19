"use client";

import { useHouseholdEditor, useLocale } from "@/hooks";
import type { Household, Location } from "@/lib/types";
import { HomeSetupForm, MemberCard } from "../household";
import styles from "./WhoStep.module.css";
import { AssumedList, WhoIntake } from "./WhoIntake";

/** Props for Step 2: Who lives here? */
interface WhoStepProps {
  location: Location;
  initialHousehold?: Household | undefined;
  initialAssumed?: readonly string[] | undefined;
  onBuildPlan: (household: Household) => void;
  onBack: () => void;
}

/**
 * Step 2: Who lives here?
 * Extracts household composition from natural language via /api/intake,
 * highlights explicit assumptions, and allows full manual editing of routines.
 */
export function WhoStep({ location, initialHousehold, initialAssumed, onBuildPlan, onBack }: WhoStepProps) {
  const { t } = useLocale();
  const editor = useHouseholdEditor({ location, initialHousehold, initialAssumed });
  const { household } = editor;

  return (
    <section className={styles.container} aria-labelledby="step-who-heading">
      <p className={styles.kicker}>{t("who_kicker")}</p>
      <h2 id="step-who-heading" className={styles.heading} tabIndex={-1}>
        {t("who_heading")}
      </h2>
      <p className={styles.description}>{t("who_description")}</p>

      <WhoIntake sentence={editor.sentence} isReading={editor.isReading} onSentenceChange={editor.setSentence} onRead={editor.readSentence} />
      <AssumedList notes={editor.assumed} />
      {editor.error && <div className={styles.errorBanner} role="alert">{editor.error}</div>}

      <div className={styles.membersList}>
        {household.members.map((member, index) => (
          <MemberCard
            key={member.id}
            member={member}
            onUpdate={(updated) => editor.updateMember(index, updated)}
            onRemove={() => editor.removeMember(index)}
            canRemove={editor.canRemoveMember}
          />
        ))}
        {editor.canAddMember && (
          <button type="button" onClick={editor.addMember} className={styles.buttonSecondary}>
            {t("who_add_person")}
          </button>
        )}
      </div>

      <HomeSetupForm home={household.home} onChange={editor.updateHome} />

      <div className={styles.footerActions}>
        <button type="button" onClick={onBack} className={styles.buttonSecondary}>
          {t("who_change_area")}
        </button>
        <button
          type="button"
          disabled={!editor.areSchedulesValid || editor.isReading}
          onClick={() => onBuildPlan(household)}
          className={styles.buttonPrimary}
        >
          {t("who_build_plan")}
        </button>
      </div>
    </section>
  );
}
