import type { ActivityWindow, HomeSetup } from "../types";

/**
 * Converts outdoor PM2.5 into the concentration a person actually breathes in a
 * given setting. Every coefficient here is a stated modelling assumption; the
 * ranges they sit inside are documented in docs/EXPOSURE-MODEL.md.
 */

/**
 * Share of outdoor PM2.5 that reaches indoor air (the infiltration factor).
 * ASSUMPTION: residential PM2.5 infiltration factors reported in the literature
 * mostly fall between roughly 0.3 and 1.0, rising with ventilation. We pick a
 * point per window habit inside that range.
 */
export const INFILTRATION_BY_WINDOW_HABIT: Readonly<Record<HomeSetup["windowHabit"], number>> = {
  kept_closed: 0.45,
  open_sometimes: 0.65,
  open_often: 0.85,
};

/**
 * Share of outdoor PM2.5 inside a car, bus or auto with windows mostly shut.
 * ASSUMPTION: in-cabin to outside ratios vary widely with ventilation mode; 0.6
 * is a middle value for typical urban commuting.
 */
export const VEHICLE_CABIN_FACTOR = 0.6;

/**
 * Multiplier on indoor PM2.5 in the room where a HEPA purifier runs.
 * ASSUMPTION: trials of portable HEPA purifiers commonly report roughly halving
 * indoor PM2.5 in the treated room; we use 0.5.
 */
export const PURIFIER_ROOM_FACTOR = 0.5;

/**
 * Extra PM2.5 (µg/m³) breathed by the person cooking, by fuel.
 * ASSUMPTION: solid and kerosene fuels produce far higher kitchen concentrations
 * than gas or electric cooking; these are conservative illustrative values.
 */
export const COOKING_INCREMENT: Readonly<Record<HomeSetup["cookingFuel"], number>> = {
  electric: 0,
  piped_gas: 10,
  lpg: 15,
  kerosene: 80,
  biomass: 300,
};

/** ASSUMPTION: a working exhaust fan or chimney removes about half of cooking smoke. */
const EXHAUST_FAN_FACTOR = 0.5;

/** ASSUMPTION: indoor smoking adds about 30 µg/m³ to indoor air whenever someone is home. */
const INDOOR_SMOKING_INCREMENT = 30;

/**
 * Share of PM2.5 that still gets through a mask outdoors.
 * ASSUMPTION: a well-fitted N95 filters far more, but real-world fit is often
 * poor, so we use a cautious 0.5.
 */
export const MASK_PASS_THROUGH = 0.5;

/**
 * PM2.5 concentration (µg/m³) a person breathes during one activity window,
 * given the outdoor concentration for that hour and the home's setup.
 */
export function concentrationFor(window: ActivityWindow, outdoorPm25: number, home: HomeSetup): number {
  const outdoor = Math.max(0, outdoorPm25);
  const breathed = baseConcentration(window, outdoor, home);
  return window.mask && window.setting !== "indoor" ? breathed * MASK_PASS_THROUGH : breathed;
}

function baseConcentration(window: ActivityWindow, outdoor: number, home: HomeSetup): number {
  if (window.setting === "outdoor") return outdoor;
  if (window.setting === "vehicle") return outdoor * VEHICLE_CABIN_FACTOR;
  return indoorConcentration(window, outdoor, home);
}

function indoorConcentration(window: ActivityWindow, outdoor: number, home: HomeSetup): number {
  const purified = home.hasPurifier && home.purifierRoom === window.room;
  const infiltrated = outdoor * INFILTRATION_BY_WINDOW_HABIT[home.windowHabit];
  const smoke = home.smokingIndoors ? INDOOR_SMOKING_INCREMENT : 0;
  const cooking = window.activity === "cooking" ? cookingIncrement(home) : 0;
  const roomAir = (infiltrated + smoke) * (purified ? PURIFIER_ROOM_FACTOR : 1);
  return roomAir + cooking;
}

function cookingIncrement(home: HomeSetup): number {
  const base = COOKING_INCREMENT[home.cookingFuel];
  return home.hasExhaustFan ? base * EXHAUST_FAN_FACTOR : base;
}
