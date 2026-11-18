/**
 * @file Pure mappings from geography and household dose to the 3D Earth scene.
 * These pure functions have zero side effects, no Three.js or DOM dependencies, and are fully unit-tested.
 */

/** Spherical cartesian coordinates on a 3D globe [x, y, z]. */
export type SphereCoords = [number, number, number];

/** Target Euler rotation angles [pitch, yaw] in radians. */
export interface GlobeRotation {
  pitch: number;
  yaw: number;
}

/** RGB color triplet with 0-1 values. */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts geographic latitude and longitude (degrees) to 3D spherical coordinates [x, y, z],
 * in the same layout THREE.SphereGeometry uses for an equirectangular texture: prime
 * meridian on +X, North Pole on +Y, longitude −90 on +Z. Tests use it to prove the
 * globe rotation really brings a city to face the camera.
 *
 * @param lat - Latitude in degrees (-90 to +90).
 * @param lng - Longitude in degrees (-180 to +180).
 * @param radius - Radius of the sphere in scene units (default 1.0).
 * @returns 3D cartesian coordinates tuple [x, y, z].
 */
export function latLngToSphereCoords(lat: number, lng: number, radius = 1.0): SphereCoords {
  const safeLat = Math.max(-90, Math.min(90, Number.isFinite(lat) ? lat : 0));
  const safeLng = Math.max(-180, Math.min(180, Number.isFinite(lng) ? lng : 0));

  const phi = (safeLat * Math.PI) / 180;
  const theta = (safeLng * Math.PI) / 180;

  // Matches the UV layout of THREE.SphereGeometry with an equirectangular
  // texture: longitude 0 sits on +X and longitude −90 on +Z (facing the camera).
  const x = radius * Math.cos(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi);
  const z = -radius * Math.cos(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Calculates the target pitch and yaw rotations (radians) so a chosen latitude and longitude
 * directly faces the camera (at +Z).
 *
 * @param lat - Latitude in degrees.
 * @param lng - Longitude in degrees.
 * @returns Euler rotation angles { pitch, yaw } in radians.
 */
export function latLngToCameraRotation(lat: number, lng: number): GlobeRotation {
  const safeLat = Math.max(-90, Math.min(90, Number.isFinite(lat) ? lat : 0));
  const safeLng = Math.max(-180, Math.min(180, Number.isFinite(lng) ? lng : 0));

  // Yaw (applied first) brings the city's meridian to the front: on a
  // THREE.SphereGeometry longitude −90 already faces +Z, hence the +90 offset.
  const yaw = (-(safeLng + 90) * Math.PI) / 180;
  // Pitch then tips the globe so the city's latitude sits at the centre.
  const pitch = (safeLat * Math.PI) / 180;

  return { pitch, yaw };
}

/**
 * Calculates the subtle atmosphere rim color shift based on household dose reduction.
 * Base: #8FC8E8 (143, 200, 232). Shifts toward teal #6FD3C1 (111, 211, 193) as dose drops,
 * and toward amber #E39B4C (227, 155, 76) as dose approaches baseline.
 *
 * @param doseRatio - Household dose ratio between 0.0 (maximum clean) and 1.0 (baseline).
 * @returns Normalized RGB triplet { r, g, b } in [0, 1].
 */
export function calculateAtmosphereRimColor(doseRatio: number): RgbColor {
  const safeRatio = Math.max(0.0, Math.min(1.0, Number.isFinite(doseRatio) ? doseRatio : 1.0));

  // Base atmosphere: rgb(0.561, 0.784, 0.910)
  const baseR = 143 / 255;
  const baseG = 200 / 255;
  const baseB = 232 / 255;

  if (safeRatio < 1.0) {
    // Shift slightly toward clean teal: #6FD3C1 (111, 211, 193)
    const cleanDelta = 1.0 - safeRatio;
    return {
      r: baseR + (111 / 255 - baseR) * cleanDelta * 0.45,
      g: baseG + (211 / 255 - baseG) * cleanDelta * 0.45,
      b: baseB + (193 / 255 - baseB) * cleanDelta * 0.45,
    };
  }

  // Slightly warmer amber shift at baseline: #E39B4C (227, 155, 76)
  return {
    r: baseR + (227 / 255 - baseR) * 0.2,
    g: baseG + (155 / 255 - baseG) * 0.2,
    b: baseB + (76 / 255 - baseB) * 0.2,
  };
}

/** One full turn every 60 seconds: visibly alive without being distracting. */
export const GLOBE_SPIN_RADIANS_PER_SECOND = (Math.PI * 2) / 60;

/**
 * Signed difference from one angle to another along the shorter way round, in
 * radians. Lets the spinning globe settle on a city without unwinding every
 * full turn it made while spinning.
 */
export function shortestAngle(from: number, to: number): number {
  const full = Math.PI * 2;
  return ((((to - from + Math.PI) % full) + full) % full) - Math.PI;
}

/**
 * Camera distance that keeps a sphere of the given radius fully inside the view
 * with some breathing room, whatever the canvas shape. The vertical field of view
 * is fixed, so on a portrait canvas the horizontal extent is the tighter limit.
 */
export function cameraDistanceToFit(radius: number, fovDegrees: number, aspect: number, margin = 1.2): number {
  const halfFov = (fovDegrees * Math.PI) / 360;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const limitingTan = Math.tan(halfFov) * Math.min(1, safeAspect);
  return (radius * margin) / Math.sin(Math.atan(limitingTan));
}
