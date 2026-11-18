"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { cameraDistanceToFit } from "./mapping";

/** Globe radius including the atmosphere shell, in scene units. */
const GLOBE_OUTER_RADIUS = 1.03;

/**
 * Moves the camera back just far enough that the whole globe stays in view
 * whenever the canvas is resized, so the poles are never cropped.
 */
export function FitCamera({ margin = 1.12 }: { margin?: number }) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || height === 0) return;
    const distance = cameraDistanceToFit(GLOBE_OUTER_RADIUS, camera.fov, width / height, margin);
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height, margin]);

  return null;
}
