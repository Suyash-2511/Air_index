import type { CSSProperties } from "react";

/**
 * Inline style that sets CSS custom properties, which drive bar heights, meters and stagger delays.
 * React's CSSProperties type does not list custom properties, so the one cast lives here.
 */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties;
}
