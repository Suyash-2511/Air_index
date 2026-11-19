import type { Household } from "../types";
import { findDaytimeWindows, findDirtiestStretch } from "./routine-windows";
import { COMMUTE_FALLBACK, COMMUTE_FIT, bestFor, endOf, titleFor, type RankedLike } from "./rules";

export type { RankedLike } from "./rules";

/** One timed routine step built deterministically from the forecast and household day. */
export interface RoutineItem {
  startHour: number;
  endHour: number;
  kind: "seal" | "ventilate" | "outdoor" | "commute" | "cook" | "sleep";
  title: string;
  detail: string;
  pm25: number;
  memberIds: string[];
  interventionId?: string | undefined;
  savedMicrograms?: number | undefined;
  reducesOwnEmissions: boolean;
}

const COOK_IDS = new Set(["kitchen_exhaust_fan", "add_exhaust_fan", "cleaner_cooking_fuel", "switch_to_clean_cooking"]);
const PURIFIER_IDS = new Set(["air_purifier_bedroom", "add_bedroom_purifier", "hepa_purifier_bedroom", "move_purifier_to_bedroom"]);

/** Builds a chronological 24-hour routine combining ambient forecast peaks, member routines, and interventions. */
export function buildRoutine(
  household: Household,
  forecast: readonly { hour: number; pm25: number; o3?: number | undefined }[],
  ranked: readonly RankedLike[],
): RoutineItem[] {
  if (forecast.length === 0) return [];
  const fMap = new Map(forecast.map((f) => [f.hour, f.pm25]));
  const o3Map = new Map(forecast.filter((f) => f.o3 !== undefined).map((f) => [f.hour, f.o3!]));
  const items: RoutineItem[] = [];

  const windows = findDaytimeWindows(fMap, o3Map);
  const clean = windows[0];

  if (clean) {
    const cleanMean = Math.round(clean.mean);
    items.push({
      startHour: clean.start, endHour: clean.end, kind: "ventilate",
      title: "Open windows for 15 minutes", detail: `Cleanest daytime air today at ${cleanMean} µg/m³.`,
      pm25: cleanMean, memberIds: household.members.map((m) => m.id), reducesOwnEmissions: false,
    });
    const outdoors = household.members.filter((m) =>
      m.windows.some((w) => w.activity === "outdoor_exercise" || w.activity === "outdoor_play"),
    );
    if (outdoors.length > 0) {
      const names = outdoors.map((m) => m.label).join(", ");
      let target = clean;
      let detail = `Least smoggy daytime hours for ${names} to be outdoors, about ${cleanMean} µg/m³.`;
      if (clean.meanO3 !== undefined && clean.meanO3 > 100) {
        const safer = windows.find((w) => w.meanO3 !== undefined && w.meanO3 <= 100);
        if (safer) {
          target = safer;
          detail = `Next-best daytime hours for ${names} to be outdoors, about ${Math.round(safer.mean)} µg/m³; afternoon ozone is elevated at ${Math.round(clean.meanO3)} µg/m³.`;
        } else {
          detail = `Least smoggy daytime hours for ${names} to be outdoors, about ${cleanMean} µg/m³, but afternoon ozone is elevated (${Math.round(clean.meanO3)} µg/m³).`;
        }
      }
      items.push({
        startHour: target.start, endHour: target.end, kind: "outdoor", title: "Best time to be outside",
        detail, pm25: Math.round(target.mean), memberIds: outdoors.map((m) => m.id), reducesOwnEmissions: false,
      });
    }
  }

  const worst = findDirtiestStretch(forecast);
  if (worst) {
    const times = Math.round(worst.mean / 60);
    const detail = times >= 2 ? `Outdoor PM2.5 averages ${worst.mean} µg/m³, about ${times}× India's daily limit.` : `Outdoor PM2.5 averages ${worst.mean} µg/m³.`;
    const sealChange = ranked.find((r) => r.id === "keep_windows_closed");
    items.push({
      startHour: worst.start, endHour: worst.end, kind: "seal", title: "Keep windows shut", detail,
      pm25: worst.mean, memberIds: household.members.map((m) => m.id),
      interventionId: sealChange?.id, savedMicrograms: sealChange?.savedMicrograms, reducesOwnEmissions: false,
    });
  }

  for (const member of household.members) {
    for (const w of member.windows) {
      if (w.activity.startsWith("commute_")) {
        const commute = bestFor(ranked, COMMUTE_FIT[w.activity] ?? []);
        const start = w.startHour;
        const end = endOf(start, w.durationMinutes);
        const pm25 = Math.round(fMap.get(start) ?? 0);
        items.push({
          startHour: start, endHour: end, kind: "commute",
          title: commute ? titleFor(commute.id) : COMMUTE_FALLBACK[w.activity] ?? "Wear an N95 mask outside",
          detail: `${member.label.trim().toLowerCase() === "you" ? "Your" : `${member.label}'s`} commute: outdoor PM2.5 is about ${pm25} µg/m³.`,
          pm25, memberIds: [member.id], interventionId: commute?.id,
          savedMicrograms: commute?.savedMicrograms, reducesOwnEmissions: commute?.reducesOwnEmissions ?? false,
        });
      }
    }
  }

  const cook = ranked.filter((r) => COOK_IDS.has(r.id)).sort((a, b) => b.savedMicrograms - a.savedMicrograms)[0];
  const isClean = cook?.id === "cleaner_cooking_fuel" || cook?.id === "switch_to_clean_cooking";
  for (const member of household.members) {
    for (const w of member.windows) {
      if (w.activity === "cooking") {
        const start = w.startHour;
        const end = endOf(start, w.durationMinutes);
        const pm25 = Math.round(fMap.get(start) ?? 0);
        items.push({
          startHour: start, endHour: end, kind: "cook",
          title: cook ? titleFor(cook.id) : household.home.hasExhaustFan ? "Run the chimney while cooking" : "Cook with the kitchen door shut",
          detail: `Cooking adds indoor PM2.5; ambient outdoor air is ${pm25} µg/m³.`,
          pm25, memberIds: [member.id], interventionId: cook?.id,
          savedMicrograms: cook?.savedMicrograms, reducesOwnEmissions: isClean || (cook?.reducesOwnEmissions ?? false),
        });
      }
    }
  }

  const purifier = ranked.find((r) => PURIFIER_IDS.has(r.id));
  const hasPurifier = household.home.hasPurifier || Boolean(purifier);
  let sleepWin: { start: number; duration: number } | undefined;
  for (const m of household.members) {
    for (const w of m.windows) {
      if (w.activity === "sleep" && (!sleepWin || w.startHour < sleepWin.start)) {
        sleepWin = { start: w.startHour, duration: w.durationMinutes };
      }
    }
  }
  if (sleepWin) {
    const start = sleepWin.start;
    const end = endOf(start, sleepWin.duration);
    const pm25 = Math.round(fMap.get(start) ?? 0);
    items.push({
      startHour: start, endHour: end, kind: "sleep",
      title: hasPurifier ? "Windows closed, purifier on in the bedroom" : "Windows closed before bed",
      detail: `Overnight outdoor PM2.5 is around ${pm25} µg/m³.`,
      pm25, memberIds: household.members.filter((m) => m.windows.some((w) => w.activity === "sleep")).map((m) => m.id),
      interventionId: purifier?.id, savedMicrograms: purifier?.savedMicrograms, reducesOwnEmissions: false,
    });
  }

  const merged = new Map<string, RoutineItem>();
  for (const it of items) {
    const key = `${it.kind}-${it.startHour}-${it.endHour}`;
    const ex = merged.get(key);
    if (ex) {
      ex.memberIds = Array.from(new Set([...ex.memberIds, ...it.memberIds]));
      if (!ex.interventionId && it.interventionId) {
        ex.interventionId = it.interventionId;
        ex.savedMicrograms = it.savedMicrograms;
        ex.reducesOwnEmissions = it.reducesOwnEmissions;
      }
    } else {
      merged.set(key, { ...it });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour)
    .slice(0, 8);
}
