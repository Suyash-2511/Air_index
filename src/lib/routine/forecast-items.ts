import { INDIA_PM25_24H_LIMIT_UGM3, LIMIT_MULTIPLE_WORTH_NOTING } from "../air/client";
import type { TranslationKey } from "../i18n";
import { OZONE_ELEVATED_UGM3, SEAL_INTERVENTION_ID } from "./constants";
import type { WindowScore } from "./routine-windows";
import type { RoutineContext, RoutineItem } from "./routine-types";

type DetailParams = Record<string, string | number>;

/** Which window to recommend for outdoor time, and the wording that explains the choice. */
interface OutdoorChoice {
  target: WindowScore;
  detail: string;
  detailKey: TranslationKey;
  detailParams: DetailParams;
}

const everyMemberId = (context: RoutineContext): string[] => context.household.members.map((member) => member.id);

/** Opens windows in the cleanest daytime stretch, for everyone in the home. */
export function buildVentilateItem(context: RoutineContext, clean: WindowScore): RoutineItem {
  const cleanMean = Math.round(clean.mean);
  return {
    startHour: clean.start,
    endHour: clean.end,
    kind: "ventilate",
    title: "Open windows for 15 minutes",
    detail: `Cleanest daytime air today at ${cleanMean} µg/m³.`,
    pm25: cleanMean,
    memberIds: everyMemberId(context),
    reducesOwnEmissions: false,
    titleKey: "routine_title_open_windows",
    detailKey: "routine_detail_open_windows",
    detailParams: { pm25: cleanMean },
  };
}

/**
 * Picks the outdoor window. Cleanest PM2.5 is the default; when that window has high ozone, the
 * next window with acceptable ozone is preferred, and the ozone is mentioned if none exists.
 */
function chooseOutdoorWindow(names: string, windows: readonly WindowScore[], clean: WindowScore): OutdoorChoice {
  const cleanMean = Math.round(clean.mean);
  if (clean.meanO3 === undefined || clean.meanO3 <= OZONE_ELEVATED_UGM3) {
    return {
      target: clean,
      detail: `Least smoggy daytime hours for ${names} to be outdoors, about ${cleanMean} µg/m³.`,
      detailKey: "routine_detail_outdoor",
      detailParams: { names, pm25: cleanMean },
    };
  }

  const o3 = Math.round(clean.meanO3);
  const safer = windows.find((window) => window.meanO3 !== undefined && window.meanO3 <= OZONE_ELEVATED_UGM3);
  if (safer) {
    const saferMean = Math.round(safer.mean);
    return {
      target: safer,
      detail: `Next-best daytime hours for ${names} to be outdoors, about ${saferMean} µg/m³; afternoon ozone is elevated at ${o3} µg/m³.`,
      detailKey: "routine_detail_outdoor_ozone_alt",
      detailParams: { names, pm25: saferMean, o3 },
    };
  }
  return {
    target: clean,
    detail: `Least smoggy daytime hours for ${names} to be outdoors, about ${cleanMean} µg/m³, but afternoon ozone is elevated (${o3} µg/m³).`,
    detailKey: "routine_detail_outdoor_ozone_warn",
    detailParams: { names, pm25: cleanMean, o3 },
  };
}

/** Best time outside, for the members who exercise or play outdoors; undefined when nobody does. */
export function buildOutdoorItem(
  context: RoutineContext,
  windows: readonly WindowScore[],
  clean: WindowScore,
): RoutineItem | undefined {
  const outdoorMembers = context.household.members.filter((member) =>
    member.windows.some((block) => block.activity === "outdoor_exercise" || block.activity === "outdoor_play"),
  );
  if (outdoorMembers.length === 0) return undefined;

  const names = outdoorMembers.map((member) => member.label).join(", ");
  const { target, detail, detailKey, detailParams } = chooseOutdoorWindow(names, windows, clean);
  return {
    startHour: target.start,
    endHour: target.end,
    kind: "outdoor",
    title: "Best time to be outside",
    detail,
    pm25: Math.round(target.mean),
    memberIds: outdoorMembers.map((member) => member.id),
    reducesOwnEmissions: false,
    titleKey: "routine_title_outdoor",
    detailKey,
    detailParams,
  };
}

/** Keep windows shut through the dirtiest stretch, linked to the ranked change that saves the most from it. */
export function buildSealItem(
  context: RoutineContext,
  worst: { start: number; end: number; mean: number },
): RoutineItem {
  const times = Math.round(worst.mean / INDIA_PM25_24H_LIMIT_UGM3);
  const exceedsLimit = times >= LIMIT_MULTIPLE_WORTH_NOTING;
  const sealChange = context.ranked.find((change) => change.id === SEAL_INTERVENTION_ID);
  return {
    startHour: worst.start,
    endHour: worst.end,
    kind: "seal",
    title: "Keep windows shut",
    detail: exceedsLimit
      ? `Outdoor PM2.5 averages ${worst.mean} µg/m³, about ${times}× India's daily limit.`
      : `Outdoor PM2.5 averages ${worst.mean} µg/m³.`,
    pm25: worst.mean,
    memberIds: everyMemberId(context),
    interventionId: sealChange?.id,
    savedMicrograms: sealChange?.savedMicrograms,
    reducesOwnEmissions: false,
    titleKey: "routine_title_keep_windows_shut",
    detailKey: exceedsLimit ? "routine_detail_keep_windows_shut_limit" : "routine_detail_keep_windows_shut",
    detailParams: exceedsLimit ? { pm25: worst.mean, times } : { pm25: worst.mean },
  };
}
