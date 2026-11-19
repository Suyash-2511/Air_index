import type { TranslationKey } from "../en";
import { hiCommunity } from "./community";
import { hiCommute } from "./commute";
import { hiData } from "./data";
import { hiHousehold } from "./household";
import { hiIndoor } from "./indoor";
import { hiLanding } from "./landing";
import { hiPlan } from "./plan";
import { hiSteps } from "./steps";

/** Complete compiled Hindi translation dictionary with compile-time key parity check. */
export const HI_TRANSLATIONS: Record<TranslationKey, string> = {
  ...hiLanding,
  ...hiSteps,
  ...hiHousehold,
  ...hiPlan,
  ...hiIndoor,
  ...hiCommute,
  ...hiCommunity,
  ...hiData,
};
