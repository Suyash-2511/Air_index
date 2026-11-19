/** Formats a microgram particle dose using standard Indian grouping (e.g. "1,23,456"). */
export function formatMicrograms(micrograms: number): string {
  if (!Number.isFinite(micrograms)) return "0";
  return Math.round(micrograms).toLocaleString("en-IN");
}
