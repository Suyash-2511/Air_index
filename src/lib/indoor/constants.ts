/**
 * Air changes per hour to aim for when sizing a purifier.
 * 4.8 follows the AHAM two-thirds rule (CADR in cfm of at least two thirds of the floor area in ft2, for an 8 ft ceiling),
 * which is the figure used for smog days; 2.0 is enough on an ordinary day.
 */
export const SMOG_TARGET_ACH = 4.8;
/** Enough on an ordinary day without smog. */
export const NORMAL_TARGET_ACH = 2.0;

/** One cubic metre per hour of clean air is 0.5886 cubic feet per minute, the unit purifier boxes quote. */
export const CFM_PER_M3H = 0.5886;

/** Assumed air exchange of a closed home with the outdoors, per hour, for an ordinary leaky Indian flat. */
export const DEFAULT_NATURAL_ACH = 0.5;

/** Assumed rate at which fine particles settle onto surfaces indoors, per hour. */
export const DEFAULT_DEPOSITION_RATE = 0.2;

/** Share of outdoor PM2.5 that reaches indoors when the window habit has no recorded value. */
export const FALLBACK_INFILTRATION = 0.45;
