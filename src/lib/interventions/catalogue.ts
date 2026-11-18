import type { DayForecast, Effort, Household } from "../types";
import { cleanestStartHour, editHome, editWindows, isCommute, isOutside } from "./transforms";

/** The kind of change, used to group suggestions in the interface. */
export type InterventionKind = "routine" | "indoor_air" | "protection" | "sustainable";

/**
 * A change a household could make. `apply` returns the household as it would
 * be after the change, or null when the change doesn't apply to this family.
 * The dose engine then measures the difference, so no saving is ever asserted
 * without being computed.
 */
export interface Intervention {
  id: string;
  kind: InterventionKind;
  effort: Effort;
  /** True when the change also cuts the household's own contribution to pollution. */
  reducesOwnEmissions: boolean;
  apply: (household: Household, forecast: DayForecast) => Household | null;
}

const YOUNG = new Set(["infant", "child"]);

/** Every change Saans knows how to evaluate. Order here has no effect on ranking. */
export const INTERVENTIONS: readonly Intervention[] = [
  {
    id: "shift_commute",
    kind: "routine",
    effort: "free",
    reducesOwnEmissions: false,
    apply: (h, forecast) =>
      editWindows(h, (w) => {
        if (!isCommute(w)) return w;
        const startHour = cleanestStartHour(w, forecast);
        return startHour === w.startHour ? w : { ...w, startHour };
      }),
  },
  {
    id: "keep_windows_closed",
    kind: "indoor_air",
    effort: "free",
    reducesOwnEmissions: false,
    apply: (h) => editHome(h, { windowHabit: "kept_closed" }),
  },
  {
    id: "move_purifier_to_bedroom",
    kind: "indoor_air",
    effort: "free",
    reducesOwnEmissions: false,
    apply: (h) => (h.home.hasPurifier ? editHome(h, { purifierRoom: "bedroom" }) : null),
  },
  {
    id: "add_bedroom_purifier",
    kind: "indoor_air",
    effort: "investment",
    reducesOwnEmissions: false,
    apply: (h) => (h.home.hasPurifier ? null : editHome(h, { hasPurifier: true, purifierRoom: "bedroom" })),
  },
  {
    id: "add_exhaust_fan",
    kind: "indoor_air",
    effort: "low_cost",
    reducesOwnEmissions: false,
    apply: (h) => (h.home.cookingFuel === "electric" ? null : editHome(h, { hasExhaustFan: true })),
  },
  {
    id: "switch_to_clean_cooking",
    kind: "sustainable",
    effort: "investment",
    reducesOwnEmissions: true,
    apply: (h) =>
      h.home.cookingFuel === "biomass" || h.home.cookingFuel === "kerosene"
        ? editHome(h, { cookingFuel: "lpg" })
        : null,
  },
  {
    id: "stop_indoor_smoking",
    kind: "sustainable",
    effort: "free",
    reducesOwnEmissions: true,
    apply: (h) => editHome(h, { smokingIndoors: false }),
  },
  {
    id: "public_transport_instead_of_cycling",
    kind: "sustainable",
    effort: "low_cost",
    reducesOwnEmissions: false,
    apply: (h) =>
      editWindows(h, (w) =>
        w.activity === "commute_cycle" ? { ...w, activity: "commute_vehicle", setting: "vehicle" } : w,
      ),
  },
  {
    id: "mask_outdoors",
    kind: "protection",
    effort: "low_cost",
    reducesOwnEmissions: false,
    apply: (h) => editWindows(h, (w) => (isOutside(w) && !w.mask ? { ...w, mask: true } : w)),
  },
  {
    id: "exercise_indoors",
    kind: "routine",
    effort: "free",
    reducesOwnEmissions: false,
    apply: (h) =>
      editWindows(h, (w) => (w.activity === "outdoor_exercise" && isOutside(w) ? { ...w, setting: "indoor" } : w)),
  },
  {
    id: "children_play_indoors",
    kind: "routine",
    effort: "free",
    reducesOwnEmissions: false,
    apply: (h) =>
      editWindows(h, (w, member) =>
        w.activity === "outdoor_play" && isOutside(w) && YOUNG.has(member.ageBand) ? { ...w, setting: "indoor" } : w,
      ),
  },
];
