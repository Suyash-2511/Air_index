"use client";

import { useState } from "react";
import { submitIntake } from "@/client/api";
import { getDefaultHousehold } from "@/data";
import { isScheduleValid } from "@/lib/exposure";
import { buildNewMember } from "@/lib/household-defaults";
import type { HomeSetup, Household, HouseholdMember, Location } from "@/lib/types";
import { useLocale } from "./useLocale";

/** The most people a household can list; more than this makes the page unwieldy and the plan unreadable. */
export const MAX_HOUSEHOLD_MEMBERS = 8;

/** Shown when the intake request fails with something that has no message of its own. */
const INTAKE_FAILED_MESSAGE = "Could not parse household description";

interface HouseholdEditorInput {
  location: Location;
  initialHousehold?: Household | undefined;
  initialAssumed?: readonly string[] | undefined;
}

/** The household being edited in step 2, with the moves the form can make on it. */
export interface HouseholdEditor {
  household: Household;
  assumed: readonly string[];
  sentence: string;
  isReading: boolean;
  error: string | undefined;
  canAddMember: boolean;
  canRemoveMember: boolean;
  areSchedulesValid: boolean;
  setSentence: (sentence: string) => void;
  readSentence: () => Promise<void>;
  updateMember: (index: number, member: HouseholdMember) => void;
  removeMember: (index: number) => void;
  addMember: () => void;
  updateHome: (home: HomeSetup) => void;
}

/** Holds step 2's state: the household, the sentence it can be read from, and what was assumed. */
export function useHouseholdEditor({ location, initialHousehold, initialAssumed }: HouseholdEditorInput): HouseholdEditor {
  const { t } = useLocale();
  const [household, setHousehold] = useState<Household>(initialHousehold ?? getDefaultHousehold(location));
  const [sentence, setSentence] = useState("");
  const [assumed, setAssumed] = useState<readonly string[]>(initialAssumed ?? []);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const readSentence = async () => {
    if (!sentence.trim()) return;
    setIsReading(true);
    setError(undefined);
    try {
      const result = await submitIntake(sentence, location);
      setHousehold(result.household);
      setAssumed(result.assumed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : INTAKE_FAILED_MESSAGE);
    } finally {
      setIsReading(false);
    }
  };

  const setMembers = (members: HouseholdMember[]) => setHousehold({ ...household, members });
  const memberCount = household.members.length;

  return {
    household,
    assumed,
    sentence,
    isReading,
    error,
    canAddMember: memberCount < MAX_HOUSEHOLD_MEMBERS,
    canRemoveMember: memberCount > 1,
    areSchedulesValid: household.members.every((member) => isScheduleValid(member.windows)),
    setSentence,
    readSentence,
    updateMember: (index, updated) => setMembers(household.members.map((member, i) => (i === index ? updated : member))),
    removeMember: (index) => {
      if (memberCount > 1) setMembers(household.members.filter((_, i) => i !== index));
    },
    addMember: () => {
      if (memberCount < MAX_HOUSEHOLD_MEMBERS) {
        setMembers([...household.members, buildNewMember(`m-${Date.now()}`, t("who_default_person", { n: memberCount + 1 }))]);
      }
    },
    updateHome: (home) => setHousehold({ ...household, home }),
  };
}
