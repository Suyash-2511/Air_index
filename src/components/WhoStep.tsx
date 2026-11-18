"use client";

import { useState } from "react";
import { submitIntake } from "@/client/api";
import { isScheduleValid } from "@/lib/exposure/schedule";
import type { Household, HouseholdMember, Location } from "@/lib/types";
import { HomeSetupForm } from "./HomeSetupForm";
import { MemberCard } from "./MemberCard";
import styles from "./WhoStep.module.css";

/** Default fallback household when user starts without sentence box. */
export function getDefaultHousehold(location: Location): Household {
  return {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 120, room: "living", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 780, room: "living", mask: false },
        ],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location,
  };
}

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
      label: `Person ${household.members.length + 1}`,
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
      <h2 id="step-who-heading" className={styles.heading} tabIndex={-1}>
        Who lives here?
      </h2>
      <p className={styles.description}>
        Describe your family routine in one sentence, or refine each person's hours and home setup below.
      </p>

      <div className={styles.intakeBox}>
        <label htmlFor="intake-textarea" className={styles.description}>
          Describe your family in plain English:
        </label>
        <textarea
          id="intake-textarea"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="e.g. My mother has asthma, I cycle to work at 8am, we cook on LPG and keep windows open"
          className={styles.textarea}
        />
        <button
          type="button"
          onClick={handleParseSentence}
          disabled={loading || !sentence.trim()}
          className={styles.buttonSecondary}
        >
          {loading ? "Reading your routine..." : "Parse Household Description"}
        </button>
      </div>

      {assumed.length > 0 && (
        <div className={styles.assumedList} role="region" aria-label="Assumed field notes">
          <span className={styles.assumedTitle}>What we assumed from your description:</span>
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
            + Add Family Member
          </button>
        )}
      </div>

      <HomeSetupForm home={household.home} onChange={(home) => setHousehold({ ...household, home })} />

      <div className={styles.footerActions}>
        <button type="button" onClick={onBack} className={styles.buttonSecondary}>
          ← Back to Location
        </button>
        <button
          type="button"
          disabled={!allValid || loading}
          onClick={() => onBuildPlan(household)}
          className={styles.buttonPrimary}
        >
          Build My Plan →
        </button>
      </div>
    </section>
  );
}
