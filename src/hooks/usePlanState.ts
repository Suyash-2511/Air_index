"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanApiResponse } from "@/client/types";
import { combineInterventions } from "@/lib/interventions";
import { buildRoutine, type RoutineItem } from "@/lib/routine";
import type { DayForecast, DoseBreakdown, Household } from "@/lib/types";
import { useCountUp } from "./useCountUp";

/** Pledges that start ticked in the community card. */
const DEFAULT_PLEDGES: readonly string[] = [
  "No burning of dry leaves, waste, or plastic",
  "Run the chimney or exhaust fan while cooking",
];

/** The headline number counts up after a short pause so the page has settled first. */
const COUNT_UP = { delay: 500, duration: 1700 };

interface PlanStateInput {
  planData: PlanApiResponse;
  household: Household;
  /** Told the dose with the chosen changes applied, so the globe can thin out its particles. */
  onDoseChange?: ((currentDose: number, baselineTotal: number) => void) | undefined;
}

/** The plan's numbers and the visitor's choices, ready for the sections to show. */
export interface PlanState {
  activeIds: readonly string[];
  commuteMode: string | undefined;
  pledges: readonly string[];
  baselineTotal: number;
  animatedBaseline: number;
  currentTotal: number;
  currentSavedUg: number;
  currentSavedPct: number;
  maxPotentialSavingsPct: number;
  currentDoses: readonly DoseBreakdown[];
  routineItems: readonly RoutineItem[];
  hasCommute: boolean;
  toggleChange: (id: string, isActive: boolean) => void;
  chooseCommuteMode: (label: string) => void;
  setPledges: (pledges: readonly string[]) => void;
}

const sumDoses = (doses: readonly DoseBreakdown[]): number => doses.reduce((sum, dose) => sum + dose.totalMicrograms, 0);

/** Share of the baseline that a lower total saves, rounded to a whole percent. */
const percentSaved = (baseline: number, total: number): number => (baseline > 0 ? Math.round(((baseline - total) / baseline) * 100) : 0);

/** Holds step 3's state: which changes are switched on and what the plan then adds up to. */
export function usePlanState({ planData, household, onDoseChange }: PlanStateInput): PlanState {
  const [activeIds, setActiveIds] = useState<readonly string[]>([]);
  const [commuteMode, setCommuteMode] = useState<string | undefined>();
  const [pledges, setPledges] = useState<readonly string[]>(DEFAULT_PLEDGES);

  const forecast: DayForecast = useMemo(
    () => new Map(planData.air.forecast.map((entry) => [entry.hour, entry.pm25])),
    [planData.air.forecast],
  );

  const baselineTotal = Math.round(planData.baselineTotal);
  const animatedBaseline = useCountUp(baselineTotal, COUNT_UP) ?? 0;

  const maxPotentialSavingsPct = useMemo(() => {
    const everyChange = planData.ranked.map((change) => change.id);
    return percentSaved(planData.baselineTotal, sumDoses(combineInterventions(household, forecast, everyChange)));
  }, [household, forecast, planData]);

  const currentDoses = useMemo(
    () => (activeIds.length === 0 ? planData.baseline : combineInterventions(household, forecast, activeIds)),
    [household, forecast, activeIds, planData.baseline],
  );
  const currentTotal = Math.round(sumDoses(currentDoses));

  const routineItems = useMemo(
    () => buildRoutine(household, planData.air.forecast, planData.ranked),
    [household, planData.air.forecast, planData.ranked],
  );
  const hasCommute = useMemo(
    () => household.members.some((member) => member.windows.some((block) => block.activity.startsWith("commute_"))),
    [household.members],
  );

  useEffect(() => {
    onDoseChange?.(currentTotal, baselineTotal);
  }, [currentTotal, baselineTotal, onDoseChange]);

  return {
    activeIds,
    commuteMode,
    pledges,
    baselineTotal,
    animatedBaseline,
    currentTotal,
    currentSavedUg: baselineTotal - currentTotal,
    currentSavedPct: percentSaved(baselineTotal, currentTotal),
    maxPotentialSavingsPct,
    currentDoses,
    routineItems,
    hasCommute,
    toggleChange: (id, isActive) => setActiveIds((previous) => (isActive ? [...previous, id] : previous.filter((other) => other !== id))),
    chooseCommuteMode: setCommuteMode,
    setPledges,
  };
}
