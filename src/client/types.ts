import type { DoseBreakdown, HourlyAir, Household } from "@/lib/types";

/** Autocomplete suggestion returned by the Places API. */
export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

/** Ranked change action with model-generated or demo plain-language explanation. */
export interface RankedAction {
  id: string;
  kind: "routine" | "indoor_air" | "protection" | "sustainable";
  effort: "free" | "low_cost" | "investment";
  reducesOwnEmissions: boolean;
  savedMicrograms: number;
  savedPercent: number;
  priorityScore: number;
  beneficiaries: readonly {
    memberId: string;
    savedMicrograms: number;
    savedPercent: number;
  }[];
  explanation?: {
    title: string;
    whyItHelps: string;
    steps: readonly string[];
    sustainableAlternative?: string | undefined;
  } | undefined;
}

/** Complete plan API response returned by /api/plan. */
export interface PlanApiResponse {
  baselineTotal: number;
  baseline: readonly DoseBreakdown[];
  ranked: readonly RankedAction[];
  air: {
    current: HourlyAir;
    forecast: readonly HourlyAir[];
  };
  demoMode: boolean;
}

/** Intake API response returned by /api/intake. */
export interface IntakeApiResponse {
  household: Household;
  assumed: readonly string[];
}

/** Ask API response returned by /api/ask. */
export interface AskApiResponse {
  answer: string;
  answerable: boolean;
  citations: readonly string[];
}
