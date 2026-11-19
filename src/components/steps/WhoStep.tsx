"use client";

import { useState } from "react";
import { submitIntake } from "@/client/api";
import { getDefaultHousehold } from "@/data/sampleHousehold";
import { useLocale } from "@/hooks/useLocale";
import { isScheduleValid } from "@/lib/exposure/schedule";
import type { Household, HouseholdMember, Location } from "@/lib/types";
import { HomeSetupForm } from "../household/HomeSetupForm";
import { MemberCard } from "../household/MemberCard";
import styles from "./WhoStep.module.css";

export { getDefaultHousehold };

/** Props for Step 2: Who lives here? */
export interface WhoStepProps {
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
export function WhoStep({
  location,
  initialHousehold,
  initialAssumed,
  onBuildPlan,
  onBack,
}: WhoStepProps) {
  const { t } = useLocale();
  const [household, setHousehold] = useState<Household>(initialHousehold ?? getDefaultHousehold(location));
  const [sentence, setSentence] = useState("");
  const [assumed, setAssumed] = useState<readonly string[]>(initialAssumed ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleParseSentence = async () => {
    if (!sentence.trim()) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await submitIntake(sentence, location);
      setHousehold(result.household);
      setAssumed(result.assumed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not parse household description");
    } finally {
      setLoading(false);
    }
  };

  const updateMember = (index: number, updated: HouseholdMember) => {
    const updatedMembers = household.members.map((m, i) => (i === index ? updated : m));
    setHousehold({ ...household, members: updatedMembers });
  };

  const removeMember = (index: number) => {
    if (household.members.length <= 1) return;
    setHousehold({ ...household, members: household.members.filter((_, i) => i !== index) });
  };

  const addMember = () => {
    if (household.members.length >= 8) return;
    const newMember: HouseholdMember = {
      id: `m-${Date.now()}`,
      label: t("who_default_person", { n: household.members.length + 1 }),
      ageBand: "adult",
      sensitivities: [],
      windows: [
        { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
        { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
      ],
    };
    setHousehold({ ...household, members: [...household.members, newMember] });
  };

  const allValid = household.members.every((m) => isScheduleValid(m.windows));

  return (
    <section className={styles.container} aria-labelledby="step-who-heading">
      <p className={styles.kicker}>{t("who_kicker")}</p>
      <h2 id="step-who-heading" className={styles.heading} tabIndex={-1}>
        {t("who_heading")}
      </h2>
      <p className={styles.description}>
        {t("who_description")}
      </p>

      <div className={styles.intakeBox}>
        <label htmlFor="intake-textarea" className={styles.description}>
          {t("who_intake_label")}
        </label>
        <textarea
          id="intake-textarea"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={t("who_intake_placeholder")}
          className={styles.textarea}
        />
        <button
          type="button"
          onClick={handleParseSentence}
          disabled={loading || !sentence.trim()}
          className={styles.buttonSecondary}
        >
          {loading ? t("who_reading_routine") : t("who_parse_btn")}
        </button>
      </div>

      {assumed.length > 0 && (
        <div className={styles.assumedList} role="region" aria-label={t("who_assumed_region")}>
          <span className={styles.assumedTitle}>{t("who_assumed_title")}</span>
          <ul>
            {assumed.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      <div className={styles.membersList}>
        {household.members.map((member, idx) => (
          <MemberCard
            key={member.id}
            member={member}
            onUpdate={(updated) => updateMember(idx, updated)}
            onRemove={() => removeMember(idx)}
            canRemove={household.members.length > 1}
          />
        ))}

        {household.members.length < 8 && (
          <button type="button" onClick={addMember} className={styles.buttonSecondary}>
            {t("who_add_person")}
          </button>
        )}
      </div>

      <HomeSetupForm home={household.home} onChange={(home) => setHousehold({ ...household, home })} />

      <div className={styles.footerActions}>
        <button type="button" onClick={onBack} className={styles.buttonSecondary}>
          {t("who_change_area")}
        </button>
        <button
          type="button"
          disabled={!allValid || loading}
          onClick={() => onBuildPlan(household)}
          className={styles.buttonPrimary}
        >
          {t("who_build_plan")}
        </button>
      </div>
    </section>
  );
}
