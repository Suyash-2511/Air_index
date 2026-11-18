import type { Household } from "../types";
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
  forecast: readonly { hour: number; pm25: number }[],
  ranked: readonly RankedLike[],
): RoutineItem[] {
  if (forecast.length === 0) return [];
  const fMap = new Map(forecast.map((f) => [f.hour, f.pm25]));
  const items: RoutineItem[] = [];

  // a) Cleanest window (07:00-19:00, 2-hour daytime block with lowest mean PM2.5)
  let clean: { start: number; end: number; mean: number } | undefined;
  for (let h = 7; h <= 17; h += 1) {
    const p1 = fMap.get(h);
    const p2 = fMap.get(h + 1);
    if (p1 !== undefined && p2 !== undefined) {
      const mean = (p1 + p2) / 2;
      if (!clean || mean < clean.mean) clean = { start: h, end: h + 2, mean };
    }
  }

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
      items.push({
        startHour: clean.start, endHour: clean.end, kind: "outdoor", title: "Best time to be outside",
        detail: `Least smoggy daytime hours for ${names} to be outdoors, about ${cleanMean} µg/m³.`,
        pm25: cleanMean, memberIds: outdoors.map((m) => m.id), reducesOwnEmissions: false,
      });
    }
  }

  // b) Dirtiest stretch: contiguous hours where PM2.5 >= max(1.5 * dailyMean, 90)
  const dailyMean = forecast.reduce((s, f) => s + f.pm25, 0) / forecast.length;
  const threshold = Math.max(1.5 * dailyMean, 90);
  const stretches: { hour: number; pm25: number }[][] = [];
  let cur: { hour: number; pm25: number }[] = [];
  for (const f of forecast) {
    if (f.pm25 >= threshold) cur.push(f);
    else if (cur.length > 0) { stretches.push(cur); cur = []; }
  }
  if (cur.length > 0) stretches.push(cur);

  if (stretches.length > 0) {
    stretches.sort((a, b) => (b.reduce((s, f) => s + f.pm25, 0) / b.length) - (a.reduce((s, f) => s + f.pm25, 0) / a.length));
    const worst = stretches[0];
    if (worst && worst.length > 0) {
      const start = worst[0]?.hour ?? 0;
      const end = Math.min(24, (worst[worst.length - 1]?.hour ?? 0) + 1);
      const mean = Math.round(worst.reduce((s, f) => s + f.pm25, 0) / worst.length);
      const times = Math.round(mean / 60);
      const detail = times >= 2 ? `Outdoor PM2.5 averages ${mean} µg/m³, about ${times}× India's daily limit.` : `Outdoor PM2.5 averages ${mean} µg/m³.`;
      const sealChange = ranked.find((r) => r.id === "keep_windows_closed");
      items.push({
        startHour: start, endHour: end, kind: "seal", title: "Keep windows shut", detail,
        pm25: mean, memberIds: household.members.map((m) => m.id),
        interventionId: sealChange?.id, savedMicrograms: sealChange?.savedMicrograms, reducesOwnEmissions: false,
      });
    }
  }

  // c) Commute windows
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

  // d) Cooking windows
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

  // e) Sleep (earliest sleep window)
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

  // f) Merge duplicates, sort, max 8 items
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
