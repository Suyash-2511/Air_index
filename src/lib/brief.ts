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
  commuteMode?: string | undefined;
  pledges?: readonly string[] | undefined;
  locale?: "en" | "hi" | undefined;
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
  const isHi = input.locale === "hi";
  const day = input.date.toLocaleDateString(isHi ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long" });
  const lines = [isHi ? `${input.areaLabel} में आज की हवा (${day})` : `Air today in ${input.areaLabel} (${day})`];

  const extremes = forecastExtremes(input.forecast);
  if (extremes) {
    const times = Math.round(extremes.worst.pm25 / INDIA_24H_PM25_LIMIT);
    lines.push(
      isHi
        ? `सबसे खराब हवा ${formatHour(extremes.worst.hour)} के आसपास: PM2.5 ${Math.round(extremes.worst.pm25)} µg/m³` + (times >= 2 ? `, जो मानक से ${times} गुना अधिक है।` : "।")
        : `Worst around ${formatHour(extremes.worst.hour)}: PM2.5 ${Math.round(extremes.worst.pm25)} µg/m³` + (times >= 2 ? `, about ${times}× India's daily limit.` : "."),
      isHi
        ? `सबसे साफ हवा ${formatHour(extremes.best.hour)} के आसपास: PM2.5 ${Math.round(extremes.best.pm25)} µg/m³। इसी समय घर में ताजी हवा लें।`
        : `Cleanest around ${formatHour(extremes.best.hour)}: PM2.5 ${Math.round(extremes.best.pm25)} µg/m³. Air out homes and walk then if you can.`,
    );
  }

  if (input.routine && input.routine.length > 0) {
    lines.push("", isHi ? "आज की दिनचर्या:" : "Today's routine:");
    input.routine.slice(0, 3).forEach((item) => {
      lines.push(`• ${formatHour(item.startHour)}: ${item.title} (${item.detail})`);
    });
  }

  if (input.commuteMode) {
    lines.push("", isHi ? `चुनी गई यात्रा: ${input.commuteMode}` : `Chosen commute mode: ${input.commuteMode}`);
  }

  if (input.pledges && input.pledges.length > 0) {
    lines.push("", isHi ? "लिए गए स्वच्छ हवा संकल्प:" : "Community clean-air pledges:");
    input.pledges.forEach((p) => lines.push(`• ${p}`));
  }

  const top = input.changes.slice(0, 3);
  if (top.length > 0) {
    lines.push("", isHi ? "सबसे प्रभावी सुरक्षा उपाय:" : "What helped most in one household's plan:");
    top.forEach((change, i) => {
      const own = change.reducesOwnEmissions ? (isHi ? " (प्रदूषण भी घटाता है)" : " (also cuts smog we make)") : "";
      lines.push(`${i + 1}. ${change.title}: ${Math.round(change.savedPercent)}%${own}`);
    });
    const shared = input.changes.find((c) => c.reducesOwnEmissions);
    if (shared) {
      lines.push(
        "",
        isHi
          ? `यदि कई परिवार "${shared.title.toLowerCase()}" अपनाते हैं, तो पूरी सड़क स्वच्छ हवा ले सकेगी।`
          : `If several homes do "${shared.title.toLowerCase()}", the whole street breathes less.`,
      );
    }
  }

  lines.push("", isHi ? "पूर्वानुमानित PM2.5 पर आधारित आकलन। चिकित्सीय सलाह नहीं।" : "Estimates from forecast PM2.5 and typical breathing rates. Not medical advice.");
  return lines.join("\n");
}

/** Builds the sentence-by-sentence script for the read-aloud button. */
export function buildReadAloudScript(input: BriefInput): string {
  const isHi = input.locale === "hi";
  if (isHi) {
    const parts = [`आज आपका परिवार लगभग ${formatMicrograms(input.householdMicrograms)} माइक्रोग्राम प्रदूषक कण सांस में लेगा।`];
    const extremes = forecastExtremes(input.forecast);
    if (extremes) {
      parts.push(`बाहरी हवा ${formatHour(extremes.worst.hour)} के आसपास सबसे खराब और ${formatHour(extremes.best.hour)} के आसपास सबसे साफ रहेगी।`);
    }
    if (input.routine && input.routine.length > 0) {
      input.routine.slice(0, 3).forEach((item) => {
        parts.push(`${formatHour(item.startHour)}: ${item.title}।`);
      });
    }
    input.changes.slice(0, 3).forEach((change, i) => {
      parts.push(`उपाय ${i + 1}: ${change.title}। इससे आपके सांस का धुआँ ${Math.round(change.savedPercent)} प्रतिशत कम होगा।`);
    });
    return parts.join(" ");
  }

  const parts = [`Today your household will breathe about ${formatMicrograms(input.householdMicrograms)} micrograms of fine particles.`];
  const extremes = forecastExtremes(input.forecast);
  if (extremes) {
    parts.push(`Outdoor air is worst around ${formatHour(extremes.worst.hour)} and cleanest around ${formatHour(extremes.best.hour)}.`);
  }
  if (input.routine && input.routine.length > 0) {
    input.routine.slice(0, 3).forEach((item) => {
      const lower = item.title.charAt(0).toLowerCase() + item.title.slice(1);
      parts.push(`At ${formatHour(item.startHour)}, ${lower}.`);
    });
  }
  input.changes.slice(0, 3).forEach((change, i) => {
    parts.push(`Change ${i + 1}: ${change.title}. It cuts your dose by ${Math.round(change.savedPercent)} percent.`);
  });
  return parts.join(" ");
}
