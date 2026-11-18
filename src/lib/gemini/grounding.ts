import type { Plan } from "../interventions/rank";
import type { HourlyAir } from "../types";

/** Known domain constants (particulate sizes, filter mask standards, criteria limits, AQI bands). */
const DOMAIN_ALLOWED_NUMBERS = new Set<number>([
  2.5, // PM2.5
  10, // PM10
  95, // N95 mask
  99, // N99 mask
  1, 2, 3, 4, 5, // Step numbers / ordinals
  24, // 24-hour day
  60, 80, 100, // Criteria pollutant limits
  50, 200, 300, 400, 500, // CPCB AQI bands
]);

export const INTERVENTION_TITLES: Record<string, string> = {
  keep_windows_closed: "Keep windows closed",
  mask_outdoors: "Wear a mask outdoors",
  public_transport_instead_of_cycling: "Use public transport instead of cycling",
  air_purifier_bedroom: "Run air purifier in bedroom",
  air_purifier_living: "Run air purifier in living room",
  cleaner_cooking_fuel: "Switch to cleaner cooking fuel",
  kitchen_exhaust_fan: "Use kitchen exhaust fan while cooking",
  shift_outdoor_exercise_afternoon: "Shift outdoor exercise to afternoon",
  shift_commute_time: "Shift commute timing",
  avoid_outdoor_play_peak: "Avoid outdoor play during peak smog hours",
};

export function getInterventionTitle(id: string): string {
  const match = INTERVENTION_TITLES[id];
  if (match) return match;
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMemberLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "You";
  const lower = trimmed.toLowerCase();
  if (lower === "self" || lower === "me" || lower === "i" || lower === "user") {
    return "You";
  }
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function stripInternalIds(
  text: string,
  memberIdToLabel: ReadonlyMap<string, string>,
  interventionIdToTitle: ReadonlyMap<string, string>,
): string {
  let cleaned = text;

  for (const [id, label] of memberIdToLabel) {
    if (!id) continue;
    const escaped = id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, "gi"), label);
  }

  for (const [id, title] of interventionIdToTitle) {
    if (!id) continue;
    const escaped = id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, "gi"), title);
  }

  return cleaned.replace(/\bmember-\d+\b/gi, "family member");
}

export function extractPlanNumbers(plan: Plan, air?: HourlyAir): Set<number> {
  const allowed = new Set<number>(DOMAIN_ALLOWED_NUMBERS);

  const addVariants = (val: number | undefined): void => {
    if (val === undefined || !Number.isFinite(val)) return;
    allowed.add(val);
    allowed.add(Math.round(val));
    allowed.add(Math.floor(val));
    allowed.add(Math.ceil(val));
    allowed.add(Math.round(val * 10) / 10);
    allowed.add(Math.round(val * 100) / 100);
  };

  addVariants(plan.baselineTotal);
  for (const dose of plan.baseline) {
    addVariants(dose.totalMicrograms);
    for (const actVal of Object.values(dose.byActivity)) addVariants(actVal);
    for (const hVal of dose.byHour) addVariants(hVal);
  }

  for (const item of plan.ranked) {
    addVariants(item.savedMicrograms);
    addVariants(item.savedPercent);
    addVariants(item.priorityScore);
    for (const ben of item.beneficiaries) {
      addVariants(ben.savedMicrograms);
      addVariants(ben.savedPercent);
    }
  }

  if (air) {
    addVariants(air.pm25);
    addVariants(air.pm10);
    addVariants(air.no2);
    addVariants(air.o3);
    addVariants(air.co);
    addVariants(air.so2);
    addVariants(air.aqi?.value);
  }

  return allowed;
}

export function isNumberGrounded(num: number, allowedNumbers: Set<number>): boolean {
  if (allowedNumbers.has(num)) return true;
  if (allowedNumbers.has(Math.round(num))) return true;
  if (allowedNumbers.has(Math.round(num * 10) / 10)) return true;

  for (const allowed of allowedNumbers) {
    if (Math.abs(num - allowed) < 0.15) return true;
  }
  return false;
}

function protectDomainTokens(sentence: string): string {
  return sentence
    .replace(/pm\s*2\.5/gi, "PM_TWO_POINT_FIVE")
    .replace(/pm\s*10/gi, "PM_TEN")
    .replace(/\bno\s*2\b/gi, "NO_TWO")
    .replace(/\bso\s*2\b/gi, "SO_TWO")
    .replace(/\bo\s*3\b/gi, "O_THREE")
    .replace(/n\s*95/gi, "N_NINETY_FIVE")
    .replace(/n\s*99/gi, "N_NINETY_NINE")
    .replace(/\b(\d{1,2}):\d{2}\b/g, "$1");
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function filterGroundedSentences(text: string, allowedNumbers: Set<number>): string {
  if (!text) return "";

  const sentences = splitIntoSentences(text);
  const grounded: string[] = [];

  for (const sentence of sentences) {
    const protectedText = protectDomainTokens(sentence);
    const matches = protectedText.match(/(?<![A-Za-z_])[-+]?\d+(?:\.\d+)?(?![A-Za-z_])/g);

    if (!matches) {
      grounded.push(sentence);
      continue;
    }

    let allNumbersValid = true;
    for (const match of matches) {
      const parsed = parseFloat(match);
      if (!Number.isFinite(parsed)) continue;

      if (!isNumberGrounded(parsed, allowedNumbers)) {
        allNumbersValid = false;
        break;
      }
    }

    if (allNumbersValid) {
      grounded.push(sentence);
    }
  }

  return grounded.join(" ");
}

export function groundText(text: string, plan: Plan, air?: HourlyAir): string {
  const allowed = extractPlanNumbers(plan, air);
  return filterGroundedSentences(text, allowed);
}
