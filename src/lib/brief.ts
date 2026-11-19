import { formatMicrograms } from "./format/number";
import { formatClock } from "./format/time";
import type { RoutineItem } from "./routine/build-routine";

/** The parts of a plan the brief needs, kept independent of UI types. */
export interface BriefInput {
  areaLabel: string;
  date: Date;
  forecast: readonly { hour: number; pm25: number }[];
  householdMicrograms: number;
  changes: readonly { title: string; savedPercent: number; reducesOwnEmissions: boolean }[];
  routine?: readonly RoutineItem[] | undefined;
}

/** India's 24-hour PM2.5 standard (NAAQS 2009), in µg/m³. */
export const INDIA_24H_PM25_LIMIT = 60;

/** Formats an hour as "7 AM" / "6 PM". */
export const formatHour = formatClock;

/** Finds the hour with the dirtiest and cleanest outdoor air in the forecast. */
export function forecastExtremes(forecast: BriefInput["forecast"]):
  | { worst: { hour: number; pm25: number }; best: { hour: number; pm25: number } }
  | undefined {
  const first = forecast[0];
  if (!first) return undefined;
  let worst = first;
  let best = first;
  for (const entry of forecast) {
    if (entry.pm25 > worst.pm25) worst = entry;
    if (entry.pm25 < best.pm25) best = entry;
  }
  return { worst, best };
}

/**
 * Builds a short, plain-text note a family can forward to a building or
 * neighbourhood group. Deterministic: every number comes from the plan.
 */
export function buildCommunityBrief(input: BriefInput): string {
  const day = input.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const lines = [`Air today in ${input.areaLabel} (${day})`];

  const extremes = forecastExtremes(input.forecast);
  if (extremes) {
    const times = Math.round(extremes.worst.pm25 / INDIA_24H_PM25_LIMIT);
    lines.push(
      `Worst around ${formatHour(extremes.worst.hour)}: PM2.5 ${Math.round(extremes.worst.pm25)} µg/m³` +
        (times >= 2 ? `, about ${times}× India's daily limit.` : "."),
      `Cleanest around ${formatHour(extremes.best.hour)}: PM2.5 ${Math.round(extremes.best.pm25)} µg/m³. Air out homes and walk then if you can.`,
    );
  }

  if (input.routine && input.routine.length > 0) {
    const topRoutine = input.routine.slice(0, 3);
    lines.push("", "Today's routine:");
    topRoutine.forEach((item) => {
      lines.push(`• ${formatHour(item.startHour)}: ${item.title} (${item.detail})`);
    });
  }

  const top = input.changes.slice(0, 3);
  if (top.length > 0) {
    lines.push("", "What helped most in one household's plan:");
    top.forEach((change, i) => {
      const own = change.reducesOwnEmissions ? " (also cuts smog we make)" : "";
      lines.push(`${i + 1}. ${change.title}: cuts that family's dose by ${Math.round(change.savedPercent)}%${own}`);
    });
  }

  const shared = input.changes.find((c) => c.reducesOwnEmissions);
  if (shared) lines.push("", `If several homes do "${shared.title.toLowerCase()}", the whole street breathes less.`);

  lines.push("", "Estimates from forecast PM2.5 and typical breathing rates. Not medical advice.");
  return lines.join("\n");
}

/** Builds the sentence-by-sentence script for the read-aloud button. */
export function buildReadAloudScript(input: BriefInput): string {
  const parts = [
    `Today your household will breathe about ${formatMicrograms(input.householdMicrograms)} micrograms of fine particles.`,
  ];
  const extremes = forecastExtremes(input.forecast);
  if (extremes) {
    parts.push(
      `Outdoor air is worst around ${formatHour(extremes.worst.hour)} and cleanest around ${formatHour(extremes.best.hour)}.`,
    );
  }
  if (input.routine && input.routine.length > 0) {
    input.routine.slice(0, 3).forEach((item) => {
      const titleLower = item.title.charAt(0).toLowerCase() + item.title.slice(1);
      parts.push(`At ${formatHour(item.startHour)}, ${titleLower}.`);
    });
  }
  input.changes.slice(0, 3).forEach((change, i) => {
    parts.push(`Change ${i + 1}: ${change.title}. It cuts your dose by ${Math.round(change.savedPercent)} percent.`);
  });
  return parts.join(" ");
}
