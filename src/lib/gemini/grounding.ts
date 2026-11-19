import type { HourlyAir } from "@/lib/types";
import { getInterventionTitle, INTERVENTION_TITLES } from "../interventions";
import type { Plan } from "../interventions";
import { roundTo } from "../format";

export { getInterventionTitle, INTERVENTION_TITLES };

const DOMAIN_ALLOWED_NUMBERS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 60,
  100, 150, 200, 300, 400, 500, 2.5, 95, 99,
];

/** Normalizes member labels to clean sentence case or 'You'. */
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

/** Replaces raw internal member and intervention IDs with friendly labels. */
export function stripInternalIds(
  text: string,
  memberIdToLabel: ReadonlyMap<string, string>,
  interventionIdToTitle: ReadonlyMap<string, string>,
): string {
  let cleaned = text;
  for (const [id, label] of memberIdToLabel) {
    cleaned = cleaned.replace(new RegExp(`\\b${id}\\b`, "g"), label);
  }
  for (const [id, title] of interventionIdToTitle) {
    cleaned = cleaned.replace(new RegExp(`\\b${id}\\b`, "g"), title);
  }
  return cleaned.replace(/\bmember-\d+\b/gi, "family member");
}

/** Extracts all allowed numerical values from a plan and current air reading. */
function extractPlanNumbers(plan: Plan, air?: HourlyAir): Set<number> {
  const allowed = new Set<number>(DOMAIN_ALLOWED_NUMBERS);
  const addVariants = (val: number | undefined): void => {
    if (val === undefined || !Number.isFinite(val)) return;
    allowed.add(val);
    allowed.add(Math.round(val));
    allowed.add(Math.floor(val));
    allowed.add(Math.ceil(val));
    allowed.add(roundTo(val, 1));
    allowed.add(roundTo(val, 2));
  };

  addVariants(plan.baselineTotal);
  for (const dose of plan.baseline) {
    addVariants(dose.totalMicrograms);
    for (const actVal of Object.values(dose.byActivity)) {
      if (typeof actVal === "number") addVariants(actVal);
    }
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

/** Checks whether a number parsed from LLM output is mathematically grounded. */
function isNumberGrounded(num: number, allowedNumbers: Set<number>): boolean {
  if (allowedNumbers.has(num)) return true;
  if (allowedNumbers.has(Math.round(num))) return true;
  if (allowedNumbers.has(roundTo(num, 1))) return true;

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

/** Filters text down to only sentences whose numbers are verified in the plan. */
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

/** Strips ungrounded numbers from model explanations against computed plan data. */
export function groundText(text: string, plan: Plan, air?: HourlyAir): string {
  const allowed = extractPlanNumbers(plan, air);
  return filterGroundedSentences(text, allowed);
}
