/** Tuning for the globe's motion and look. Radians and seconds unless a name says otherwise. */

/** The globe grows from this scale to 1 while the first textures arrive. */
export const INTRO_START_SCALE = 0.92;
/** Progress per second of the intro; about 0.9 s to complete. */
export const INTRO_RATE = 1.1;

/** Largest pointer tilt: 5 degrees, so the globe leans toward the cursor without looking loose. */
export const MAX_POINTER_TILT = 0.087;
export const TILT_SMOOTHING = 3.5;

/** When facing a chosen city the globe sways slightly so it stays alive. */
export const FOCUS_SWAY_AMPLITUDE = 0.08;
export const FOCUS_SWAY_SPEED = 0.25;
export const FOCUS_EASE = 1.6;

/** While spinning freely only part of the city latitude is brought to the front, so the globe is not tipped over. */
export const SPIN_PITCH_FACTOR = 0.7;
export const PITCH_EASE = 2;

/** Sun from the upper left, slightly in front: most of the visible face is daylit and the evening edge with city lights runs down the right. */
export const SUN_DIRECTION: readonly [number, number, number] = [-0.45, 0.25, 0.86];

export const ATMOSPHERE_BASE_COLOR = "#8FC8E8";
export const ATMOSPHERE_INTENSITY = 0.45;

export const EARTH_RADIUS = 1;
export const ATMOSPHERE_RADIUS = 1.025;
