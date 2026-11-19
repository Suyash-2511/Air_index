import { enCommunity } from "./community";
import { enCommute } from "./commute";
import { enData } from "./data";
import { enHousehold } from "./household";
import { enIndoor } from "./indoor";
import { enLanding } from "./landing";
import { enPlan } from "./plan";
import { enSteps } from "./steps";

/** Complete compiled English translation dictionary. */
export const EN_TRANSLATIONS = {
  ...enLanding,
  ...enSteps,
  ...enHousehold,
  ...enPlan,
  ...enIndoor,
  ...enCommute,
  ...enCommunity,
  ...enData,
} as const;

/** Exhaustive string key union of all valid translation keys. */
export type TranslationKey = keyof typeof EN_TRANSLATIONS;
