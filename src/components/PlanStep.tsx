"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanApiResponse } from "@/client/types";
import { combineInterventions } from "@/lib/interventions/combine";
import { buildRoutine } from "@/lib/routine/build-routine";
import type { DayForecast, DoseBreakdown, Household } from "@/lib/types";
import { AreaMap } from "./AreaMap";
import { AirToday } from "./AirToday";
import { AskPanel } from "./AskPanel";
import { ChangeCard } from "./ChangeCard";
import { DayStrip } from "./DayStrip";
import { PlanActions } from "./PlanActions";
import { RoutineTimeline } from "./RoutineTimeline";
import { useCountUp } from "./useCountUp";
import styles from "./PlanStep.module.css";

/** Props for Step 3: Your plan. */
export interface PlanStepProps {
  planData: PlanApiResponse;
  household: Household;
  onBack: () => void;
  onDoseChange?: (currentDose: number, baselineTotal: number) => void;
}

/**
 * Step 3: Your plan.
 * Displays the asymmetric layout with count-up headline reveal,
 * time-ordered routine timeline, ranked glass change cards with instant
 * zero-fetch recomputation, and 24h day strip in sync with the 3D smog sphere.
 */
export function PlanStep({ planData, household, onBack, onDoseChange }: PlanStepProps) {
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const forecastMap: DayForecast = useMemo(
    () => new Map(planData.air.forecast.map((f) => [f.hour, f.pm25])),
    [planData.air.forecast],
  );

  const baselineTotal = Math.round(planData.baselineTotal);
  const animatedBaseline = useCountUp(baselineTotal, { delay: 500, duration: 1700 }) ?? 0;

  const maxPotentialSavingsPct = useMemo(() => {
    const allIds = planData.ranked.map((r) => r.id);
    const combinedAll = combineInterventions(household, forecastMap, allIds);
    const totalAll = combinedAll.reduce((sum, d) => sum + d.totalMicrograms, 0);
    const saved = planData.baselineTotal - totalAll;
    return planData.baselineTotal > 0 ? Math.round((saved / planData.baselineTotal) * 100) : 0;
  }, [household, forecastMap, planData]);

  const currentDoses: readonly DoseBreakdown[] = useMemo(() => {
    if (activeIds.length === 0) return planData.baseline;
    return combineInterventions(household, forecastMap, activeIds);
  }, [household, forecastMap, activeIds, planData.baseline]);

  const currentTotal = Math.round(currentDoses.reduce((sum, d) => sum + d.totalMicrograms, 0));
  const currentSavedUg = baselineTotal - currentTotal;
  const currentSavedPct = baselineTotal > 0 ? Math.round((currentSavedUg / baselineTotal) * 100) : 0;

  const routineItems = useMemo(() => {
    return buildRoutine(household, planData.air.forecast, planData.ranked);
  }, [household, planData.air.forecast, planData.ranked]);

  useEffect(() => {
    onDoseChange?.(currentTotal, baselineTotal);
  }, [currentTotal, baselineTotal, onDoseChange]);

  const handleToggle = (id: string, active: boolean) => {
    setActiveIds((prev) => (active ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  return (
    <div className={styles.layout}>
      <button type="button" onClick={onBack} className={styles.backButton}>
        ← Edit household
      </button>

      <header className={styles.headlineArea}>
        <p className={styles.kicker}>Entry 03 · Today&apos;s dose</p>
        <h2 className={styles.headlineMain}>
          <span className={styles.lead}>Today your household will breathe</span>{" "}
          <span className={styles.figureMask}>
            <span className={styles.figure}>
              {(activeIds.length === 0 ? animatedBaseline : currentTotal).toLocaleString("en-IN")}
              <span className={styles.unit}> µg</span>
            </span>
          </span>{" "}
          <span className={styles.lead}>of PM2.5.</span>
        </h2>
        <div className={styles.meter} aria-hidden="true">
          <span className={styles.meterFill} style={{ transform: `scaleX(${baselineTotal > 0 ? currentTotal / baselineTotal : 1})` }} />
        </div>
        <div className={styles.meterLabels} aria-hidden="true">
          <span>With your changes</span>
          <span>Baseline {baselineTotal.toLocaleString("en-IN")} µg</span>
        </div>
        <p className={styles.headlineCut}>
          {activeIds.length === 0 ? (
            <>These changes could cut that by up to <span className="tabular-nums">{maxPotentialSavingsPct}%</span>.</>
          ) : (
            <>Cutting exposure by <span className="tabular-nums">{currentSavedPct}%</span> ({currentSavedUg} µg saved) with {activeIds.length} active change{activeIds.length > 1 ? "s" : ""}.</>
          )}
        </p>
      </header>

      <div className={styles.fullRow}>
        <AirToday air={planData.air.current} />
      </div>

      <div className={styles.fullRow}>
        <PlanActions
          planData={planData}
          household={household}
          currentTotal={currentTotal}
          routine={routineItems}
        />
      </div>

      <div className={styles.leftColumn}>
        <RoutineTimeline
          items={routineItems}
          areaLabel={household.location.label}
          household={household}
          activeIds={activeIds}
          onToggleIntervention={handleToggle}
        />

        <section className={styles.cardsSection} aria-labelledby="ranked-changes-title">
          <h3 id="ranked-changes-title" className={styles.cardsTitle}>
            Changes, ranked by what they save ({planData.ranked.length})
          </h3>
          {planData.ranked.length === 0 ? (
            <p className={styles.emptyCards}>
              No effective changes identified for this routine. Your routine already minimizes outdoor exposure.
            </p>
          ) : (
            planData.ranked.map((action, i) => (
              <ChangeCard
                key={action.id}
                rank={i + 1}
                action={action}
                isActive={activeIds.includes(action.id)}
                onToggle={handleToggle}
              />
            ))
          )}
        </section>

      </div>

      <div className={styles.rightColumn}>
        <AreaMap
          lat={household.location.lat}
          lng={household.location.lng}
          label={household.location.label}
        />

        <DayStrip
          household={household}
          baselineDoses={planData.baseline}
          currentDoses={currentDoses}
          hasChangesActive={activeIds.length > 0}
        />

        <AskPanel household={household} />
      </div>
    </div>
  );
}
