import { householdDose } from "../exposure";
import { vulnerabilityWeight } from "../exposure";
import type { DayForecast, DoseBreakdown, Effort, Household } from "../types";
import { INTERVENTIONS, type Intervention, type InterventionKind } from "./catalogue";

/** What one member gains from a change. */
interface MemberSaving {
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

/** The whole plan: baseline doses and the changes ranked by how much they save. */
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

/** Today's dose before any change: the starting point every change is measured against. */
interface Baseline {
  doses: readonly DoseBreakdown[];
  total: number;
}

/** Per-member savings of a change, and the vulnerability-weighted score used to rank it. */
function measureSavings(
  household: Household,
  baseline: readonly DoseBreakdown[],
  after: readonly DoseBreakdown[],
): { beneficiaries: MemberSaving[]; priorityScore: number } {
  const beneficiaries: MemberSaving[] = [];
  let priorityScore = 0;
  household.members.forEach((member, index) => {
    const before = baseline[index]?.totalMicrograms ?? 0;
    const saved = before - (after[index]?.totalMicrograms ?? 0);
    if (saved > MIN_SAVING) {
      beneficiaries.push({ memberId: member.id, savedMicrograms: saved, savedPercent: percent(saved, before) });
    }
    priorityScore += saved * vulnerabilityWeight(member);
  });
  return { beneficiaries, priorityScore };
}

function evaluate(
  intervention: Intervention,
  household: Household,
  forecast: DayForecast,
  baseline: Baseline,
): RankedIntervention | null {
  const changed = intervention.apply(household, forecast);
  if (!changed) return null;

  const { beneficiaries, priorityScore } = measureSavings(household, baseline.doses, householdDose(changed, forecast));
  const savedMicrograms = beneficiaries.reduce((sum, beneficiary) => sum + beneficiary.savedMicrograms, 0);
  if (savedMicrograms <= MIN_SAVING || priorityScore <= MIN_SAVING) return null;
  return {
    id: intervention.id,
    kind: intervention.kind,
    effort: intervention.effort,
    reducesOwnEmissions: intervention.reducesOwnEmissions,
    savedMicrograms,
    savedPercent: percent(savedMicrograms, baseline.total),
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
  const doses = householdDose(household, forecast);
  const baselineTotal = doses.reduce((sum, dose) => sum + dose.totalMicrograms, 0);
  const baseline: Baseline = { doses, total: baselineTotal };
  const ranked = catalogue
    .map((intervention) => evaluate(intervention, household, forecast, baseline))
    .filter((r): r is RankedIntervention => r !== null)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
  return { baseline: doses, baselineTotal, ranked };
}
