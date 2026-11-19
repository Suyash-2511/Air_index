"use client";

import { type RefObject, useEffect, useState } from "react";

/** True while the tab is in the background or the element is scrolled out of view, so animation can stop. */
export function usePauseWhenHidden(elementRef: RefObject<HTMLElement | null>): boolean {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const element = elementRef.current;
    const observer =
      typeof IntersectionObserver !== "undefined" && element
        ? new IntersectionObserver((entries) => entries.forEach((entry) => setIsPaused(!entry.isIntersecting)))
        : undefined;
    if (element) observer?.observe(element);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [elementRef]);

  return isPaused;
}
