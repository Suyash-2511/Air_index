/** Formats a microgram particle dose using standard Indian grouping (e.g. "1,23,456"). */
export function formatMicrograms(micrograms: number): string {
  if (!Number.isFinite(micrograms)) return "0";
  return Math.round(micrograms).toLocaleString("en-IN");
}

/** Rounds to a fixed number of decimal places; used so every reported figure rounds the same way. */
export function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
