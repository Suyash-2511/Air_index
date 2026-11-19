/** First hour of the daytime band searched for the cleanest air (07:00). */
export const DAYTIME_START_HOUR = 7;

/** Last hour a two-hour daytime window may start in, so it ends by 19:00. */
export const DAYTIME_LAST_WINDOW_START = 17;

/** Hours in one routine window; windows are scored as the mean of two consecutive hours. */
export const WINDOW_HOURS = 2;

/**
 * Afternoon ozone above this (µg/m³) makes the cleanest-PM2.5 window a poor choice for outdoor exercise.
 * It is the CPCB 8-hour ozone breakpoint between "satisfactory" and "moderate".
 */
export const OZONE_ELEVATED_UGM3 = 100;

/** A stretch counts as a smog peak when it is this many times the day's mean PM2.5 ... */
export const SMOG_PEAK_MEAN_MULTIPLE = 1.5;

/** ... or at least this concentration (µg/m³), whichever is higher; the top of CPCB's "moderate" PM2.5 band. */
export const SMOG_PEAK_MIN_UGM3 = 90;

/** The routine shows the day's most useful steps only; more would bury the important ones. */
export const MAX_ROUTINE_ITEMS = 8;

/** Ranked change that seals the home during the dirtiest stretch. */
export const SEAL_INTERVENTION_ID = "keep_windows_closed";
