"use client";

import { useState } from "react";
import { computePlan } from "@/client/api";
import type { PlanApiResponse } from "@/client/types";
import { getDefaultHousehold, getSampleHousehold } from "@/data";
import type { Locale } from "@/lib/i18n";
import type { Household, Location } from "@/lib/types";

/** The screen the visitor is on: 0 is the landing page, 1 to 3 are the three steps. */
export type HomeStep = 0 | 1 | 2 | 3;

/** What the sample family assumes about the home, shown beside its routine. */
const SAMPLE_ASSUMPTIONS: readonly string[] = ["No air purifier in the home", "No kitchen exhaust fan"];

/** Shown when the plan request fails with something that has no message of its own. */
const PLAN_FAILED_MESSAGE = "Failed to calculate exposure plan";

/** Dose density when no change is applied; the globe's particle count scales from it. */
const BASELINE_DENSITY = 1;

/** Everything the three steps share, and the moves between them. */
export interface HomeFlow {
  step: HomeStep;
  location: Location | undefined;
  household: Household | undefined;
  assumedNotes: readonly string[];
  planData: PlanApiResponse | undefined;
  doseDensity: number;
  isLoading: boolean;
  error: string | undefined;
  goToStep: (step: HomeStep) => void;
  confirmLocation: (location: Location, isDemo?: boolean) => void;
  buildPlan: (household: Household) => Promise<void>;
  changeDose: (current: number, baseline: number) => void;
}

/** Owns the wizard's state so the page only has to lay it out. */
export function useHomeFlow(locale: Locale): HomeFlow {
  const [step, setStep] = useState<HomeStep>(0);
  const [location, setLocation] = useState<Location | undefined>();
  const [household, setHousehold] = useState<Household | undefined>();
  const [assumedNotes, setAssumedNotes] = useState<readonly string[]>([]);
  const [planData, setPlanData] = useState<PlanApiResponse | undefined>();
  const [doseDensity, setDoseDensity] = useState(BASELINE_DENSITY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const confirmLocation = (confirmed: Location, isDemo = false) => {
    setLocation(confirmed);
    setError(undefined);
    setHousehold(isDemo ? getSampleHousehold(confirmed) : getDefaultHousehold(confirmed));
    setAssumedNotes(isDemo ? SAMPLE_ASSUMPTIONS : []);
    setStep(2);
  };

  const buildPlan = async (current: Household) => {
    setHousehold(current);
    setIsLoading(true);
    setError(undefined);
    try {
      setPlanData(await computePlan(current, locale));
      setDoseDensity(BASELINE_DENSITY);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : PLAN_FAILED_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const changeDose = (current: number, baseline: number) => {
    setDoseDensity(baseline > 0 ? current / baseline : BASELINE_DENSITY);
  };

  return { step, location, household, assumedNotes, planData, doseDensity, isLoading, error, goToStep: setStep, confirmLocation, buildPlan, changeDose };
}
