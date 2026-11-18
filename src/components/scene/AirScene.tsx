"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { EarthGlobe } from "./earth/EarthGlobe";
import { FitCamera } from "./FitCamera";
import { StaticFallback } from "./StaticFallback";

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

function checkWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Three.js Earth centrepiece: spins on the landing page and turns to face the chosen city.
 * Automatically handles WebGL support, reduced motion, mobile concurrency, and offscreen pausing.
 */
export function AirScene({
  lat = 28.6139,
  lng = 77.209,
  cityName = "New Delhi",
  pm25,
  density,
  focused = false,
  className = "",
}: AirSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasMedia = typeof window.matchMedia === "function";
    const prefersReduced = hasMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webglSupported = checkWebGL();
    const touch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    setIsTouch(touch);
    setCanRender3D(webglSupported && !prefersReduced);

    if (hasMedia) {
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handleMotionChange = (e: MediaQueryListEvent) => {
        setCanRender3D(webglSupported && !e.matches);
      };
      motionQuery.addEventListener("change", handleMotionChange);
      return () => motionQuery.removeEventListener("change", handleMotionChange);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && containerRef.current) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          setIsPaused(!entry.isIntersecting);
        }
      });
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      observer?.disconnect();
    };
  }, []);

  // SSR or fallback when WebGL is absent or reduced motion is requested
  if (canRender3D === false || canRender3D === null) {
    return (
      <StaticFallback
        pm25={pm25}
        cityName={cityName}
        className={className}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
      aria-hidden="true"
    >
      <Canvas
        frameloop={isPaused ? "never" : "always"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3.4], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.2} color="#FFFFFF" />
        <FitCamera />
        <EarthGlobe
          lat={lat}
          lng={lng}
          density={density}
          isTouch={isTouch}
          focused={focused}
        />
      </Canvas>
    </div>
  );
}

export default AirScene;
