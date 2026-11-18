import { z } from "zod";

/**
 * Age bands map one-to-one onto rows of the EPA Exposure Factors Handbook
 * inhalation-rate table, so a member's band decides which published breathing
 * rates apply to them. See src/lib/exposure/breathing-rates.ts.
 */
export const AGE_BANDS = ["infant", "child", "teen", "adult", "older_adult"] as const;
export const ageBandSchema = z.enum(AGE_BANDS);
export type AgeBand = z.infer<typeof ageBandSchema>;

/**
 * Health conditions that make a member more vulnerable to PM2.5. They never
 * change the physical dose a person inhales; they only raise that person's
 * weight when the household's options are ranked.
 */
export const SENSITIVITIES = ["asthma", "copd", "heart_condition", "pregnancy"] as const;
export const sensitivitySchema = z.enum(SENSITIVITIES);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

/**
 * Everyday activities a family member does across a day. Each activity maps to
 * an EPA activity-intensity level, which sets how much air the person breathes.
 */
export const ACTIVITIES = [
  "sleep",
  "rest_indoor",
  "light_indoor",
  "cooking",
  "commute_vehicle",
  "commute_walk",
  "commute_cycle",
  "outdoor_work",
  "outdoor_exercise",
  "outdoor_play",
] as const;
export const activitySchema = z.enum(ACTIVITIES);
export type Activity = z.infer<typeof activitySchema>;

/** Where an activity happens decides whether outdoor or indoor air is breathed. */
export const SETTINGS = ["indoor", "outdoor", "vehicle"] as const;
export const settingSchema = z.enum(SETTINGS);
export type Setting = z.infer<typeof settingSchema>;

/**
 * One block of a member's day. Hours are whole local hours (0–23) because
 * air-quality forecasts are hourly; a block may run past midnight.
 */
export const activityWindowSchema = z.object({
  activity: activitySchema,
  setting: settingSchema,
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().min(0).max(24 * 60),
  room: z.enum(["bedroom", "living"]).default("living"),
  mask: z.boolean().default(false),
});
export type ActivityWindow = z.infer<typeof activityWindowSchema>;

export const householdMemberSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  ageBand: ageBandSchema,
  sensitivities: z.array(sensitivitySchema).max(SENSITIVITIES.length).default([]),
  windows: z.array(activityWindowSchema).min(1).max(24),
});
export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const WINDOW_HABITS = ["open_often", "open_sometimes", "kept_closed"] as const;
export const COOKING_FUELS = ["electric", "piped_gas", "lpg", "kerosene", "biomass"] as const;

/** The home features that decide how much outdoor smog gets in and what is made indoors. */
export const homeSetupSchema = z.object({
  windowHabit: z.enum(WINDOW_HABITS),
  hasPurifier: z.boolean(),
  purifierRoom: z.enum(["bedroom", "living"]).default("living"),
  cookingFuel: z.enum(COOKING_FUELS),
  hasExhaustFan: z.boolean(),
  smokingIndoors: z.boolean(),
});
export type HomeSetup = z.infer<typeof homeSetupSchema>;

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().min(1).max(120),
});
export type Location = z.infer<typeof locationSchema>;

export const householdSchema = z.object({
  members: z.array(householdMemberSchema).min(1).max(8),
  home: homeSetupSchema,
  location: locationSchema,
});
export type Household = z.infer<typeof householdSchema>;

/** Summary of Indian National Air Quality Index (CPCB) or computed fallback. */
export const aqiSummarySchema = z.object({
  value: z.number().min(0).max(500),
  category: z.string(),
  dominantPollutant: z.string(),
  source: z.enum(["cpcb", "computed"]),
});
export type AqiSummary = z.infer<typeof aqiSummarySchema>;

/** One hour of outdoor air. All criteria concentrations are µg/m³; CO is mg/m³. */
export const hourlyAirSchema = z.object({
  hour: z.number().int().min(0).max(23),
  pm25: z.number().min(0).max(2000),
  pm10: z.number().min(0).max(2000).optional(),
  no2: z.number().min(0).max(2000).optional(),
  o3: z.number().min(0).max(2000).optional(),
  co: z.number().min(0).max(200).optional(),
  so2: z.number().min(0).max(2000).optional(),
  aqi: aqiSummarySchema.optional(),
  timeZoneFallback: z.boolean().optional(),
});
export type HourlyAir = z.infer<typeof hourlyAirSchema>;

/** A full day of hourly outdoor PM2.5, keyed by hour for constant-time lookups. */
export type DayForecast = ReadonlyMap<number, number>;

/** Inhaled PM2.5 for one member over one day, broken down for explanation. */
export interface DoseBreakdown {
  memberId: string;
  totalMicrograms: number;
  byActivity: Readonly<Partial<Record<Activity, number>>>;
  byHour: readonly number[];
}

/** How much effort or money a change takes, so families can pick realistic options. */
export const EFFORT_LEVELS = ["free", "low_cost", "investment"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];
