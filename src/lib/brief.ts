import { INDIA_PM25_24H_LIMIT_UGM3, LIMIT_MULTIPLE_WORTH_NOTING } from "./air/client";
import { briefCopyFor, type BriefCopy } from "./brief-copy";
import { formatMicrograms } from "./format";
import { formatClock } from "./format";
import type { Locale } from "./i18n";
import type { RoutineItem } from "./routine";

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
  locale?: Locale | undefined;
}

/** How many routine steps and changes the brief mentions; more would stop it fitting in a chat message. */
const MAX_BRIEF_ITEMS = 3;

/** Formats an hour as "7 AM" / "6 PM". */
export const formatHour = formatClock;

type Reading = { hour: number; pm25: number };

/** Finds the hour with the dirtiest and cleanest outdoor air in the forecast. */
export function forecastExtremes(forecast: BriefInput["forecast"]): { worst: Reading; best: Reading } | undefined {
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

/** The first few routine steps, or none when the household has no routine yet. */
const topRoutine = (input: BriefInput): readonly RoutineItem[] => (input.routine ?? []).slice(0, MAX_BRIEF_ITEMS);

function headingLines(input: BriefInput, copy: BriefCopy): string[] {
  const day = input.date.toLocaleDateString(input.locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return [copy.heading(input.areaLabel, day)];
}

/** Says when the air is worst and cleanest; the "× the limit" note appears only when it is striking. */
function extremesLines(input: BriefInput, copy: BriefCopy): string[] {
  const extremes = forecastExtremes(input.forecast);
  if (!extremes) return [];
  const timesLimit = Math.round(extremes.worst.pm25 / INDIA_PM25_24H_LIMIT_UGM3);
  return [
    copy.worstAir(formatHour(extremes.worst.hour), Math.round(extremes.worst.pm25), timesLimit >= LIMIT_MULTIPLE_WORTH_NOTING ? timesLimit : 0),
    copy.bestAir(formatHour(extremes.best.hour), Math.round(extremes.best.pm25)),
  ];
}

function routineLines(input: BriefInput, copy: BriefCopy): string[] {
  const steps = topRoutine(input);
  if (steps.length === 0) return [];
  return ["", copy.routineHeading, ...steps.map((item) => `• ${formatHour(item.startHour)}: ${item.title} (${item.detail})`)];
}

function commuteLines(input: BriefInput, copy: BriefCopy): string[] {
  return input.commuteMode ? ["", copy.commuteMode(input.commuteMode)] : [];
}

function pledgeLines(input: BriefInput, copy: BriefCopy): string[] {
  const pledges = input.pledges ?? [];
  return pledges.length > 0 ? ["", copy.pledgesHeading, ...pledges.map((pledge) => `• ${pledge}`)] : [];
}

/** The top changes with their savings, plus an invitation when one of them also cuts the household's own emissions. */
function changeLines(input: BriefInput, copy: BriefCopy): string[] {
  const top = input.changes.slice(0, MAX_BRIEF_ITEMS);
  if (top.length === 0) return [];

  const lines = ["", copy.changesHeading];
  top.forEach((change, index) => {
    const own = change.reducesOwnEmissions ? copy.alsoCutsSmog : "";
    lines.push(`${index + 1}. ${change.title}: ${Math.round(change.savedPercent)}%${own}`);
  });
  const shared = input.changes.find((change) => change.reducesOwnEmissions);
  if (shared) lines.push("", copy.sharedAdoption(shared.title));
  return lines;
}

/**
 * Builds a short, plain-text note a family can forward to a building or
 * neighbourhood group. Deterministic: every number comes from the plan.
 */
export function buildCommunityBrief(input: BriefInput): string {
  const copy = briefCopyFor(input.locale);
  return [
    ...headingLines(input, copy),
    ...extremesLines(input, copy),
    ...routineLines(input, copy),
    ...commuteLines(input, copy),
    ...pledgeLines(input, copy),
    ...changeLines(input, copy),
    "",
    copy.disclaimer,
  ].join("\n");
}

/** Builds the sentence-by-sentence script for the read-aloud button. */
export function buildReadAloudScript(input: BriefInput): string {
  const { speech } = briefCopyFor(input.locale);
  const extremes = forecastExtremes(input.forecast);
  const sentences = [
    speech.intro(formatMicrograms(input.householdMicrograms)),
    ...(extremes ? [speech.extremes(formatHour(extremes.worst.hour), formatHour(extremes.best.hour))] : []),
    ...topRoutine(input).map((item) => speech.routineStep(formatHour(item.startHour), item.title)),
    ...input.changes
      .slice(0, MAX_BRIEF_ITEMS)
      .map((change, index) => speech.change(index + 1, change.title, Math.round(change.savedPercent))),
  ];
  return sentences.join(" ");
}
