import type { TranslationKey } from "@/lib/i18n";

/** Definition of a community emission reduction pledge. */
export interface PledgeDefinition {
  id: string;
  title: string;
  effect: string;
  titleKey: TranslationKey;
  effectKey: TranslationKey;
}

/** Pledges a household can make that cut smoke and exhaust at the source; titles stay in English for the shared brief. */
export const PLEDGES: readonly PledgeDefinition[] = [
  {
    id: "no_waste_burning",
    title: "No burning of dry leaves, waste, or plastic",
    effect: "Open burning sends smoke straight into the air your street breathes, often at night when it stays trapped near the ground.",
    titleKey: "pledge_no_waste_burning_title",
    effectKey: "pledge_no_waste_burning_effect",
  },
  {
    id: "carpool_or_metro",
    title: "Carpool or take the metro at least twice a week",
    effect: "Fewer cars on the road means less exhaust along your route, and the metro emits far less CO₂ per person than driving alone.",
    titleKey: "pledge_carpool_or_metro_title",
    effectKey: "pledge_carpool_or_metro_effect",
  },
  {
    id: "clean_cooking_fuel",
    title: "Switch away from kerosene or biomass cookstoves",
    effect: "Kerosene and wood smoke is one of the biggest indoor sources of fine particles; LPG, piped gas or induction removes most of it.",
    titleKey: "pledge_clean_cooking_fuel_title",
    effectKey: "pledge_clean_cooking_fuel_effect",
  },
  {
    id: "run_chimney_cooking",
    title: "Run the chimney or exhaust fan while cooking",
    effect: "Pulls cooking smoke and oil fumes out of the kitchen before they spread to the rest of the home.",
    titleKey: "pledge_run_chimney_cooking_title",
    effectKey: "pledge_run_chimney_cooking_effect",
  },
];

/** Pledges ticked when the card first appears. */
export const DEFAULT_PLEDGE_IDS: readonly string[] = ["no_waste_burning", "run_chimney_cooking"];
