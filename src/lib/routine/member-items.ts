import type { TranslationKey } from "../i18n";
import type { ActivityWindow, HouseholdMember } from "../types";
import { bestFor, COMMUTE_FALLBACK, COMMUTE_FIT, endOf, titleFor, type RankedLike } from "./rules";
import type { RoutineContext, RoutineItem } from "./routine-types";

/** Ranked changes that act on cooking; the one that saves the most is shown. */
const COOK_INTERVENTION_IDS = new Set(["kitchen_exhaust_fan", "add_exhaust_fan", "cleaner_cooking_fuel", "switch_to_clean_cooking"]);
/** Ranked changes that put a purifier in the bedroom. */
const PURIFIER_INTERVENTION_IDS = new Set(["air_purifier_bedroom", "add_bedroom_purifier", "hepa_purifier_bedroom", "move_purifier_to_bedroom"]);
const CLEAN_COOKING_IDS = new Set(["cleaner_cooking_fuel", "switch_to_clean_cooking"]);
const PUBLIC_TRANSPORT_ID = "public_transport_instead_of_cycling";

/** Which title to show for each kind of commute when no better change applies; N95 covers the rest. */
const COMMUTE_TITLE_KEYS: Record<string, TranslationKey> = {
  commute_cycle: "routine_title_commute_mask_cycle",
  commute_walk: "routine_title_commute_mask_walk",
  commute_vehicle: "routine_title_commute_recirculate",
};

interface MemberBlock {
  member: HouseholdMember;
  block: ActivityWindow;
}

/** Every block of every member's day, in household order. */
function allBlocks(context: RoutineContext): MemberBlock[] {
  return context.household.members.flatMap((member) => member.windows.map((block) => ({ member, block })));
}

const pm25At = (context: RoutineContext, hour: number): number => Math.round(context.pm25ByHour.get(hour) ?? 0);

/** Public transport gets its own title; otherwise the title follows the kind of commute, with N95 as the catch-all. */
function commuteTitleKey(commute: RankedLike | undefined, activity: string): TranslationKey {
  if (commute?.id === PUBLIC_TRANSPORT_ID) return "routine_title_commute_public";
  return COMMUTE_TITLE_KEYS[activity] ?? "routine_title_commute_n95";
}

/** The change's own title, or the generic advice for this kind of commute when no change applies. */
function commuteTitle(commute: RankedLike | undefined, activity: ActivityWindow["activity"]): string {
  return commute ? titleFor(commute.id) : (COMMUTE_FALLBACK[activity] ?? "Wear an N95 mask outside");
}

/** One commute step for a member, using the best ranked change for that kind of commute. */
function buildCommuteItem(context: RoutineContext, { member, block }: MemberBlock): RoutineItem {
  const commute = bestFor(context.ranked, COMMUTE_FIT[block.activity] ?? []);
  const pm25 = pm25At(context, block.startHour);
  const isYou = member.label.trim().toLowerCase() === "you";
  return {
    startHour: block.startHour,
    endHour: endOf(block.startHour, block.durationMinutes),
    kind: "commute",
    title: commuteTitle(commute, block.activity),
    detail: `${isYou ? "Your" : `${member.label}'s`} commute: outdoor PM2.5 is about ${pm25} µg/m³.`,
    pm25,
    memberIds: [member.id],
    interventionId: commute?.id,
    savedMicrograms: commute?.savedMicrograms,
    reducesOwnEmissions: commute?.reducesOwnEmissions ?? false,
    titleKey: commuteTitleKey(commute, block.activity),
    detailKey: isYou ? "routine_detail_commute_you" : "routine_detail_commute",
    detailParams: isYou ? { pm25 } : { name: member.label, pm25 },
  };
}

/** A commute step for each commuting block in the household. */
export function buildCommuteItems(context: RoutineContext): RoutineItem[] {
  return allBlocks(context)
    .filter(({ block }) => block.activity.startsWith("commute_"))
    .map((memberBlock) => buildCommuteItem(context, memberBlock));
}

/** The cooking change that saves the most, if any change applies to cooking at all. */
function bestCookingChange(ranked: readonly RankedLike[]): RankedLike | undefined {
  return ranked.filter((change) => COOK_INTERVENTION_IDS.has(change.id)).sort((a, b) => b.savedMicrograms - a.savedMicrograms)[0];
}

/** Wording for the cooking step: clean fuel beats a chimney, which beats just shutting the kitchen door. */
function cookingWording(context: RoutineContext, cook: RankedLike | undefined) {
  const hasChimney = context.household.home.hasExhaustFan;
  const switchesFuel = cook !== undefined && CLEAN_COOKING_IDS.has(cook.id);
  const titleKey: TranslationKey = switchesFuel
    ? "routine_title_clean_fuel"
    : cook || hasChimney
      ? "routine_title_cook_chimney"
      : "routine_title_cook_door";
  const title = cook ? titleFor(cook.id) : hasChimney ? "Run the chimney while cooking" : "Cook with the kitchen door shut";
  return { title, titleKey, switchesFuel };
}

/** A cooking step for each cooking block in the household. */
export function buildCookItems(context: RoutineContext): RoutineItem[] {
  const cook = bestCookingChange(context.ranked);
  const { title, titleKey, switchesFuel } = cookingWording(context, cook);
  return allBlocks(context)
    .filter(({ block }) => block.activity === "cooking")
    .map(({ member, block }): RoutineItem => {
      const pm25 = pm25At(context, block.startHour);
      return {
        startHour: block.startHour,
        endHour: endOf(block.startHour, block.durationMinutes),
        kind: "cook",
        title,
        detail: `Cooking adds indoor PM2.5; ambient outdoor air is ${pm25} µg/m³.`,
        pm25,
        memberIds: [member.id],
        interventionId: cook?.id,
        savedMicrograms: cook?.savedMicrograms,
        reducesOwnEmissions: switchesFuel || (cook?.reducesOwnEmissions ?? false),
        titleKey,
        detailKey: "routine_detail_cook",
        detailParams: { pm25 },
      };
    });
}

/** The earliest-starting sleep block in the household, which sets when the home should be sealed for the night. */
function findEarliestSleep(context: RoutineContext): ActivityWindow | undefined {
  return allBlocks(context)
    .filter(({ block }) => block.activity === "sleep")
    .reduce<ActivityWindow | undefined>((earliest, { block }) => (!earliest || block.startHour < earliest.startHour ? block : earliest), undefined);
}

/** Close windows before bed, with the purifier if there is one or one is recommended. */
export function buildSleepItem(context: RoutineContext): RoutineItem | undefined {
  const sleep = findEarliestSleep(context);
  if (!sleep) return undefined;

  const purifier = context.ranked.find((change) => PURIFIER_INTERVENTION_IDS.has(change.id));
  const hasPurifier = context.household.home.hasPurifier || Boolean(purifier);
  const pm25 = pm25At(context, sleep.startHour);
  return {
    startHour: sleep.startHour,
    endHour: endOf(sleep.startHour, sleep.durationMinutes),
    kind: "sleep",
    title: hasPurifier ? "Windows closed, purifier on in the bedroom" : "Windows closed before bed",
    detail: `Overnight outdoor PM2.5 is around ${pm25} µg/m³.`,
    pm25,
    memberIds: context.household.members.filter((member) => member.windows.some((block) => block.activity === "sleep")).map((member) => member.id),
    interventionId: purifier?.id,
    savedMicrograms: purifier?.savedMicrograms,
    reducesOwnEmissions: false,
    titleKey: hasPurifier ? "routine_title_sleep_purifier" : "routine_title_sleep_shut",
    detailKey: "routine_detail_sleep",
    detailParams: { pm25 },
  };
}
