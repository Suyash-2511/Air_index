import { z } from "zod";
import { hourlyAirSchema, householdSchema } from "@/lib/types";

/** Schema for generic error response payload. */
export const errorResponseSchema = z.object({
  error: z.string().optional(),
});

/** Schema for /api/places response. */
export const placesApiResponseSchema = z.object({
  predictions: z
    .array(
      z.object({
        placeId: z.string(),
        primaryText: z.string(),
        secondaryText: z.string(),
      }),
    )
    .default([]),
});

/** Schema for /api/places/[id] response. */
export const placeLocationApiResponseSchema = z.object({
  place: z.object({
    label: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
});

/** Schema for /api/geocode response. */
export const geocodeApiResponseSchema = z.object({
  location: z.object({
    label: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
});

/** Schema for /api/intake response. */
export const intakeApiResponseSchema = z.object({
  household: householdSchema,
  assumed: z.array(z.string()).default([]),
});

/** Schema for individual dose breakdown. */
const doseBreakdownSchema = z.object({
  memberId: z.string(),
  totalMicrograms: z.number(),
  byActivity: z.record(z.string(), z.number().optional()).default({}),
  byHour: z.array(z.number()),
});

/** Schema for ranked intervention action. */
export const rankedActionSchema = z.object({
  id: z.string(),
  kind: z.enum(["routine", "indoor_air", "protection", "sustainable"]),
  effort: z.enum(["free", "low_cost", "investment"]),
  reducesOwnEmissions: z.boolean(),
  savedMicrograms: z.number(),
  savedPercent: z.number(),
  priorityScore: z.number(),
  beneficiaries: z.array(
    z.object({
      memberId: z.string(),
      savedMicrograms: z.number(),
      savedPercent: z.number(),
    }),
  ),
  explanation: z
    .object({
      title: z.string(),
      whyItHelps: z.string(),
      steps: z.array(z.string()),
      sustainableAlternative: z.string().optional(),
    })
    .optional(),
});

/** Schema for /api/plan response. */
export const planApiResponseSchema = z.object({
  baselineTotal: z.number(),
  baseline: z.array(doseBreakdownSchema),
  ranked: z.array(rankedActionSchema),
  air: z.object({
    current: hourlyAirSchema,
    forecast: z.array(hourlyAirSchema),
  }),
  demoMode: z.boolean(),
});

/** Schema for /api/ask response. */
export const askApiResponseSchema = z.object({
  answer: z.string().default(""),
  answerable: z.boolean().default(false),
  citations: z.array(z.string()).default([]),
});

/** Schema for /api/air response. */
export const airApiResponseSchema = z.object({
  current: z.object({
    pm25: z.number(),
    aqi: z
      .object({
        value: z.number(),
        category: z.string(),
        dominantPollutant: z.string().optional(),
      })
      .optional(),
  }),
});
