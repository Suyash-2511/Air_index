/** A typical one-way city commute, used until the visitor enters their own distance. */
export const DEFAULT_COMMUTE_KM = 8;

/** Distances outside this range are clamped: below it the dose is negligible, above it the speeds assumed stop being realistic. */
export const MIN_COMMUTE_KM = 0.5;
export const MAX_COMMUTE_KM = 50;

/** No trip is shorter than a minute, so a very short distance still has a visible duration. */
export const MIN_TRIP_MINUTES = 1;
