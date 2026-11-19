import type { PlanApiResponse } from "@/client/types";
import type { BriefInput } from "@/lib/brief";
import type { Locale } from "@/lib/i18n";
import { getInterventionTitle } from "@/lib/interventions";
import type { RoutineItem } from "@/lib/routine";
import type { Household } from "@/lib/types";

interface BriefInputSource {
  planData: PlanApiResponse;
  household: Household;
  currentTotal: number;
  routine?: readonly RoutineItem[] | undefined;
  commuteMode?: string | undefined;
  pledges?: readonly string[] | undefined;
  locale: Locale;
}

/** Gathers what the community brief and the read-aloud script need from the plan and the visitor's choices. */
export function buildBriefInput({ planData, household, currentTotal, routine, commuteMode, pledges, locale }: BriefInputSource): BriefInput {
  return {
    areaLabel: household.location.label,
    date: new Date(),
    forecast: planData.air.forecast,
    householdMicrograms: currentTotal,
    changes: planData.ranked.map((action) => ({
      title: action.explanation?.title ?? getInterventionTitle(action.id),
      savedPercent: action.savedPercent,
      reducesOwnEmissions: action.reducesOwnEmissions,
    })),
    routine,
    commuteMode,
    pledges,
    locale,
  };
}
