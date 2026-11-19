import type { TranslationKey } from "../i18n";
import type { Household } from "../types";
import type { RankedLike } from "./rules";

/** One timed routine step built deterministically from the forecast and household day. */
export interface RoutineItem {
  startHour: number;
  endHour: number;
  kind: "seal" | "ventilate" | "outdoor" | "commute" | "cook" | "sleep";
  title: string;
  detail: string;
  pm25: number;
  memberIds: string[];
  interventionId?: string | undefined;
  savedMicrograms?: number | undefined;
  reducesOwnEmissions: boolean;
  titleKey?: TranslationKey;
  detailKey?: TranslationKey;
  detailParams?: Record<string, string | number>;
}

/** What every routine step needs to know about the household and the day. */
export interface RoutineContext {
  household: Household;
  ranked: readonly RankedLike[];
  /** Outdoor PM2.5 keyed by hour of day. */
  pm25ByHour: ReadonlyMap<number, number>;
}
