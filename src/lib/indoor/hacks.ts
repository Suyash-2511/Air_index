import type { TranslationKey } from "../i18n";

/** Cost category for practical indoor air actions. */
export type HackCost = "Free" | "Under ₹500" | "Under ₹3,000";

/** Effort required to implement the action. */
export type HackEffort = "minimal" | "low" | "medium";

/** Practical indoor air mitigation tip or myth-busting card. */
export interface IndoorHack {
  id: string;
  title: string;
  costTag: HackCost;
  effort: HackEffort;
  effectPhrase: string;
  steps: readonly string[];
  isMyth?: boolean;
  titleKey: TranslationKey;
  costKey: TranslationKey;
  effectKey: TranslationKey;
  stepKeys: readonly TranslationKey[];
}

const RAW_HACKS: readonly Omit<IndoorHack, "titleKey" | "costKey" | "effectKey" | "stepKeys">[] = [
  {
    id: "box_fan_filter",
    title: "DIY box-fan air cleaner",
    costTag: "Under ₹3,000",
    effort: "medium",
    effectPhrase: "Cuts room particles by up to 80% at a fraction of commercial purifier cost.",
    steps: [
      "Tape a 16–20 inch MERV-13 filter firmly to the intake side of a standard box fan.",
      "Ensure an airtight perimeter seal with masking or duct tape to prevent edge bypass.",
      "Run on medium speed in closed living rooms or bedrooms during smog peaks.",
    ],
  },
  {
    id: "wet_mopping",
    title: "Wet mop floors instead of dry broom",
    costTag: "Free",
    effort: "minimal",
    effectPhrase: "Stops millions of fine settled particles from being kicked back into breathing air.",
    steps: [
      "Replace dry sweeping (jhadu) with a damp cloth or microfiber mop.",
      "Use warm water to bind micro-dust rather than aerosolising it.",
      "Mop twice daily during severe winter pollution spikes.",
    ],
  },
  {
    id: "seal_door_gaps",
    title: "Seal window edges and bottom door gaps",
    costTag: "Under ₹500",
    effort: "low",
    effectPhrase: "Lowers outdoor toxic haze intrusion into your living space by 20–30%.",
    steps: [
      "Fit self-adhesive silicone or foam draft tape along rattling window seams.",
      "Place a rolled towel or twin draft guard under exterior doors.",
      "Keep balcony and terrace access doors shut firmly after sunset.",
    ],
  },
  {
    id: "skip_incense_coils",
    title: "Skip agarbatti and mosquito coils",
    costTag: "Free",
    effort: "minimal",
    effectPhrase: "Prevents extreme indoor particle spikes equivalent to tens of burning cigarettes.",
    steps: [
      "Avoid lighting incense or dhoop sticks inside closed rooms during winter.",
      "Replace smouldering mosquito coils with mosquito nets or electrical liquid repellents.",
      "Keep camphor burning outdoors or in well-ventilated courtyards.",
    ],
  },
  {
    id: "exhaust_after_cooking",
    title: "Run exhaust fan 15 min after cooking",
    costTag: "Free",
    effort: "minimal",
    effectPhrase: "Flushes trapped oil droplets and combustion soot before they disperse into bedrooms.",
    steps: [
      "Switch on the kitchen chimney or window exhaust before lighting the burner.",
      "Close kitchen doors to stop cooking plume migration across the house.",
      "Let the fan run for 15 minutes after switching off stoves to clear lingering fumes.",
    ],
  },
  {
    id: "ventilate_clean_hour",
    title: "Air out only at the cleanest hour",
    costTag: "Free",
    effort: "minimal",
    effectPhrase: "Refreshes oxygen and dilutes indoor CO2 when outside air is at its daily minimum.",
    steps: [
      "Check today's routine timeline for the designated mid-day ventilation slot.",
      "Open opposite windows for 15–20 minutes to create rapid cross-ventilation.",
      "Seal windows completely before 5:00 PM as temperature inversion begins.",
    ],
  },
  {
    id: "n95_mask_fit",
    title: "Wear a snug N95 mask outside",
    costTag: "Under ₹500",
    effort: "low",
    effectPhrase: "Filters over 95% of airborne fine particulate matter when fitted with an airtight seal.",
    steps: [
      "Choose an ISI- or NIOSH-certified N95/FFP2 respirator with headstraps rather than ear loops.",
      "Press the metal nose clip firmly across the bridge of your nose.",
      "Avoid cloth or surgical masks, which leave large gaps and leak polluted air around edges.",
    ],
  },
  {
    id: "plant_myth",
    title: "Houseplants do not clean room air",
    costTag: "Free",
    effort: "minimal",
    effectPhrase: "A 1989 NASA chamber study is often misread: at home you would need hundreds of plants per square metre to match normal ventilation.",
    steps: [
      "Enjoy indoor plants for aesthetics, but do not rely on them as smog filters.",
      "A home would require 10–100 plants per square metre to match one mechanical filter.",
      "Prioritise physical envelope sealing and HEPA or MERV filtration for particle protection.",
    ],
    isMyth: true,
  },
];

function costToKey(c: HackCost): TranslationKey {
  if (c === "Free") return "cost_free";
  if (c === "Under ₹500") return "cost_under_500";
  return "cost_under_3000";
}

/** Eight evidence-based residential indoor air hacks and myth-busters with i18n support. */
export const INDOOR_HACKS: readonly IndoorHack[] = RAW_HACKS.map((h) => ({
  ...h,
  titleKey: `hack_${h.id}_title` as TranslationKey,
  costKey: costToKey(h.costTag),
  effectKey: `hack_${h.id}_effect` as TranslationKey,
  stepKeys: h.steps.map((_, i) => `hack_${h.id}_step_${i}` as TranslationKey),
}));

/** Filters hacks by cost tag or returns all. */
export function filterHacksByCost(hacks: readonly IndoorHack[], cost: HackCost | "All"): readonly IndoorHack[] {
  if (cost === "All") return hacks;
  return hacks.filter((h) => h.costTag === cost);
}
