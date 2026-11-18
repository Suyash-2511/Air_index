import type { Plan } from "../interventions/rank";

/** Known domain constants (particulate sizes, filter mask standards, clock range). */
const DOMAIN_ALLOWED_NUMBERS = new Set<number>([
  2.5, // PM2.5
  10, // PM10
  95, // N95 mask
  99, // N99 mask
  1, 2, 3, 4, 5, // Step numbers / ordinals
  24, // 24-hour day
]);

/**
 * Extracts and normalizes all quantitative values from a computed Plan.
 * Adds exact values, rounded integers, and 1-decimal approximations into the allowed set.
 */
export function extractPlanNumbers(plan: Plan): Set<number> {
  const allowed = new Set<number>(DOMAIN_ALLOWED_NUMBERS);

  const addVariants = (val: number): void => {
    if (!Number.isFinite(val)) return;
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
    for (const actVal of Object.values(dose.byActivity)) {
      if (typeof actVal === "number") addVariants(actVal);
    }
    for (const hVal of dose.byHour) {
      addVariants(hVal);
    }
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

  return allowed;
}

/**
 * Checks whether an extracted number matches an allowed plan value after rounding tolerance.
 */
export function isNumberGrounded(num: number, allowedNumbers: Set<number>): boolean {
  if (allowedNumbers.has(num)) return true;
  if (allowedNumbers.has(Math.round(num))) return true;
  if (allowedNumbers.has(Math.round(num * 10) / 10)) return true;

  for (const allowed of allowedNumbers) {
    if (Math.abs(num - allowed) < 0.15) return true;
  }
  return false;
}

/**
 * Normalizes text to protect domain tokens (e.g. PM2.5, N95) from false rejection.
 */
function protectDomainTokens(sentence: string): string {
  return sentence
    .replace(/pm\s*2\.5/gi, "PM_TWO_POINT_FIVE")
    .replace(/pm\s*10/gi, "PM_TEN")
    .replace(/n\s*95/gi, "N_NINETY_FIVE")
    .replace(/n\s*99/gi, "N_NINETY_NINE")
    .replace(/\b(\d{1,2}):\d{2}\b/g, "$1"); // Replace time e.g. 8:00 with hour 8
}

/**
 * Splits text into individual sentences while preserving basic sentence integrity.
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Filters text sentence by sentence. Any sentence containing an unmatched number
 * not grounded in the plan or standard domain definitions is stripped entirely.
 */
export function filterGroundedSentences(text: string, allowedNumbers: Set<number>): string {
  if (!text) return "";

  const sentences = splitIntoSentences(text);
  const grounded: string[] = [];

  for (const sentence of sentences) {
    const protectedText = protectDomainTokens(sentence);
    const matches = protectedText.match(/(?<![A-Za-z_])[-+]?\d+(?:\.\d+)?(?![A-Za-z_])/g);

    if (!matches) {
      // Sentence has no numbers; safe to retain
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

/**
 * Grounding pipeline: verifies all numbers in model text against the computed Plan.
 * Drops any sentence containing fabricated, hallucinated, or modified numbers.
 */
export function groundText(text: string, plan: Plan): string {
  const allowed = extractPlanNumbers(plan);
  return filterGroundedSentences(text, allowed);
}
