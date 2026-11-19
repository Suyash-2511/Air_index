"use client";

import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { DELHI_DEMO_LOCATION } from "@/data";
import { usePauseWhenHidden } from "@/hooks";
import { useSceneCapabilities } from "@/hooks";
import styles from "./AirScene.module.css";
import { EarthGlobe } from "./earth/EarthGlobe";
import { FitCamera } from "./FitCamera";
import { StaticFallback } from "./StaticFallback";

/** Props for the Earth scene: the place to face, the air to show, and how the dose has changed. */
export interface AirSceneProps {
  lat?: number;
  lng?: number;
  cityName?: string;
  pm25?: number | undefined;
  density: number;
  /** Turn the globe to face the chosen city instead of spinning freely. */
  focused?: boolean;
  className?: string;
}

/** Pixel ratio range: sharp on retina screens without paying for a full 3x render. */
const PIXEL_RATIO: [number, number] = [1, 1.5];
const CAMERA: { position: [number, number, number]; fov: number } = { position: [0, 0, 3.4], fov: 45 };

/**
 * Three.js Earth centrepiece: spins on the landing page and turns to face the chosen city.
 * Automatically handles WebGL support, reduced motion, mobile concurrency, and offscreen pausing.
 */
export function AirScene({
  lat = DELHI_DEMO_LOCATION.lat,
  lng = DELHI_DEMO_LOCATION.lng,
  cityName = "New Delhi",
  pm25,
  density,
  focused = false,
  className = "",
}: AirSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canRender3D, isTouch } = useSceneCapabilities();
  const isPaused = usePauseWhenHidden(containerRef);

  // The still picture covers server rendering, missing WebGL and reduced motion.
  if (!canRender3D) return <StaticFallback pm25={pm25} cityName={cityName} className={className} />;

  return (
    <div ref={containerRef} className={`${styles.sceneWrapper} ${className}`.trim()} aria-hidden="true">
      <Canvas
        frameloop={isPaused ? "never" : "always"}
        dpr={PIXEL_RATIO}
        camera={CAMERA}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.2} color="#FFFFFF" />
        <FitCamera />
        <EarthGlobe lat={lat} lng={lng} density={density} isTouch={isTouch} focused={focused} />
      </Canvas>
    </div>
  );
}

export default AirScene;
