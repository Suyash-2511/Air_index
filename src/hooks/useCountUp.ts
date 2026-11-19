"use client";

import { useEffect, useState } from "react";

/** Ease-out quart: fast start, long soft landing, matching the motion tokens. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Options configuring duration and initial delay for animated number count-ups. */
interface CountUpOptions {
  /** Time the count takes once it starts, in milliseconds. */
  duration?: number;
  /** Time to wait before the count starts, in milliseconds. */
  delay?: number;
}

/**
 * Counts from zero up to a whole-number target with an ease-out curve.
 * Returns undefined while there is no target, and jumps straight to target when reduced motion is requested.
 */
export function useCountUp(target: number | undefined, options: CountUpOptions = {}): number | undefined {
  const { duration = 1400, delay = 0 } = options;
  const [value, setValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (target === undefined) {
      setValue(undefined);
      return;
    }
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      setValue(target);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start - delay) / duration));
      setValue(Math.round(target * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
}
