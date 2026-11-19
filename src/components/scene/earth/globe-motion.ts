import * as THREE from "three";
import { shortestAngle } from "../mapping";
import {
  FOCUS_EASE,
  FOCUS_SWAY_AMPLITUDE,
  FOCUS_SWAY_SPEED,
  INTRO_RATE,
  INTRO_START_SCALE,
  MAX_POINTER_TILT,
  PITCH_EASE,
  SPIN_PITCH_FACTOR,
  TILT_SMOOTHING,
} from "./constants";

/** What changes from frame to frame; kept in a ref so animating never re-renders React. */
export interface GlobeMotion {
  introProgress: number;
  yaw: number;
  tiltX: number;
  tiltY: number;
}

interface Pointer {
  x: number;
  y: number;
}

/** Grows the globe and brightens city lights over the first second. */
export function advanceIntro(motion: GlobeMotion, delta: number, group: THREE.Group | null, material: THREE.ShaderMaterial | null): void {
  if (motion.introProgress >= 1) return;
  motion.introProgress = Math.min(1, motion.introProgress + delta * INTRO_RATE);
  const scale = THREE.MathUtils.lerp(INTRO_START_SCALE, 1, motion.introProgress);
  group?.scale.set(scale, scale, scale);
  const boost = material?.uniforms.uCityLightsBoost;
  if (boost) boost.value = motion.introProgress;
}

/** Leans the globe toward the pointer, smoothed so it follows with a little lag. */
export function advanceTilt(motion: GlobeMotion, pointer: Pointer, delta: number): void {
  const blend = delta * TILT_SMOOTHING;
  motion.tiltX = THREE.MathUtils.lerp(motion.tiltX, -pointer.y * MAX_POINTER_TILT, blend);
  motion.tiltY = THREE.MathUtils.lerp(motion.tiltY, pointer.x * MAX_POINTER_TILT, blend);
}

interface YawInput {
  isFocused: boolean;
  targetYaw: number;
  elapsed: number;
  delta: number;
  spinRate: number;
}

/** Settles on the chosen city the short way round, or keeps spinning when none is chosen. */
export function advanceYaw(motion: GlobeMotion, { isFocused, targetYaw, elapsed, delta, spinRate }: YawInput): void {
  if (!isFocused) {
    motion.yaw += delta * spinRate;
    return;
  }
  const goal = targetYaw + Math.sin(elapsed * FOCUS_SWAY_SPEED) * FOCUS_SWAY_AMPLITUDE;
  motion.yaw += shortestAngle(motion.yaw, goal) * Math.min(1, delta * FOCUS_EASE);
}

interface RotationInput {
  targetPitch: number;
  isFocused: boolean;
  delta: number;
}

/** Applies the motion to the group; while spinning, only part of the city latitude is brought to the front. */
export function applyRotation(group: THREE.Group, motion: GlobeMotion, { targetPitch, isFocused, delta }: RotationInput): void {
  const pitchGoal = targetPitch * (isFocused ? 1 : SPIN_PITCH_FACTOR) + motion.tiltX;
  group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, pitchGoal, Math.min(1, delta * PITCH_EASE));
  group.rotation.y = motion.yaw + motion.tiltY;
}
