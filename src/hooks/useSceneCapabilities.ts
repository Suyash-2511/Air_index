"use client";

import { useEffect, useState } from "react";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    // Some privacy modes throw on canvas access; no WebGL is the right answer there.
    return false;
  }
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the 3D globe can run: WebGL must exist and the visitor must not have asked for reduced motion.
 * Null until the browser has been asked, so the server render and first paint show the still picture.
 */
export function useSceneCapabilities(): { canRender3D: boolean | null; isTouch: boolean } {
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasMedia = typeof window.matchMedia === "function";
    const hasWebGL = supportsWebGL();
    const motionQuery = hasMedia ? window.matchMedia(REDUCED_MOTION_QUERY) : undefined;

    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setCanRender3D(hasWebGL && !motionQuery?.matches);

    if (!motionQuery) return;
    const onChange = (event: MediaQueryListEvent) => setCanRender3D(hasWebGL && !event.matches);
    motionQuery.addEventListener("change", onChange);
    return () => motionQuery.removeEventListener("change", onChange);
  }, []);

  return { canRender3D, isTouch };
}
