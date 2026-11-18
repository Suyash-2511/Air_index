import { householdDose } from "../exposure/dose";
import { vulnerabilityWeight } from "../exposure/vulnerability";
import type { DayForecast, DoseBreakdown, Effort, Household } from "../types";
import { INTERVENTIONS, type Intervention, type InterventionKind } from "./catalogue";

/** What one member gains from a change. */
export interface MemberSaving {
  memberId: string;
  savedMicrograms: number;
  savedPercent: number;
}

/** A change that applies to this household, with its measured effect. */
export interface RankedIntervention {
  id: string;
  kind: InterventionKind;
  effort: Effort;
  reducesOwnEmissions: boolean;
  savedMicrograms: number;
  savedPercent: number;
  /** Savings weighted by each member's vulnerability; this is the sort key. */
  priorityScore: number;
  beneficiaries: readonly MemberSaving[];
}

export interface Plan {
  baseline: readonly DoseBreakdown[];
  baselineTotal: number;
  ranked: readonly RankedIntervention[];
}

/** Savings below this (µg/day) are noise from floating-point arithmetic, not real change. */
const MIN_SAVING = 0.01;

function percent(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function evaluate(
  intervention: Intervention,
  household: Household,
  forecast: DayForecast,
  baseline: readonly DoseBreakdown[],
  baselineTotal: number,
): RankedIntervention | null {
  const changed = intervention.apply(household, forecast);
  if (!changed) return null;
  const after = householdDose(changed, forecast);
  let priorityScore = 0;
  const beneficiaries: MemberSaving[] = [];
  household.members.forEach((member, i) => {
    const before = baseline[i]?.totalMicrograms ?? 0;
    const saved = before - (after[i]?.totalMicrograms ?? 0);
    if (saved > MIN_SAVING) {
      beneficiaries.push({ memberId: member.id, savedMicrograms: saved, savedPercent: percent(saved, before) });
    }
    priorityScore += saved * vulnerabilityWeight(member);
  });
  const savedMicrograms = beneficiaries.reduce((sum, b) => sum + b.savedMicrograms, 0);
  if (savedMicrograms <= MIN_SAVING || priorityScore <= MIN_SAVING) return null;
  return {
    id: intervention.id,
    kind: intervention.kind,
    effort: intervention.effort,
    reducesOwnEmissions: intervention.reducesOwnEmissions,
    savedMicrograms,
    savedPercent: percent(savedMicrograms, baselineTotal),
    priorityScore,
    beneficiaries,
  };
}

/**
 * Measures every applicable change against today's baseline and ranks them by
 * vulnerability-weighted saving. Ties fall back to the change's id so the same
 * household always gets the same order.
 */
export function buildPlan(
  household: Household,
  forecast: DayForecast,
  catalogue: readonly Intervention[] = INTERVENTIONS,
): Plan {
  const baseline = householdDose(household, forecast);
  const baselineTotal = baseline.reduce((sum, d) => sum + d.totalMicrograms, 0);
  const ranked = catalogue
    .map((intervention) => evaluate(intervention, household, forecast, baseline, baselineTotal))
    .filter((r): r is RankedIntervention => r !== null)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
  return { baseline, baselineTotal, ranked };
}
