import type { z } from "zod";
import type { askApiResponseSchema, intakeApiResponseSchema, planApiResponseSchema, rankedActionSchema } from "./schemas";

/** Autocomplete suggestion returned by the Places API, named for the combobox that shows it. */
export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

/** Ranked change action with model-generated or demo plain-language explanation. */
export type RankedAction = z.infer<typeof rankedActionSchema>;

/** Complete plan API response returned by /api/plan. */
export type PlanApiResponse = z.infer<typeof planApiResponseSchema>;

/** Intake API response returned by /api/intake. */
export type IntakeApiResponse = z.infer<typeof intakeApiResponseSchema>;

/** Ask API response returned by /api/ask. */
export type AskApiResponse = z.infer<typeof askApiResponseSchema>;
