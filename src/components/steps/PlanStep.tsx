"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanApiResponse } from "@/client/types";
import { useCountUp } from "@/hooks/useCountUp";
import { useLocale } from "@/hooks/useLocale";
import { combineInterventions } from "@/lib/interventions/combine";
import { buildRoutine } from "@/lib/routine/build-routine";
import type { DayForecast, DoseBreakdown, Household } from "@/lib/types";
import { CommunityPledge } from "../community";
import { CommuteCompare } from "../commute";
import { AirToday, AreaMap, AskPanel, ChangeCard, DayStrip, IndoorAirSection, PlanActions, RoutineTimeline } from "../plan";
import { PlanHeadline } from "./PlanHeadline";
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
 * Displays the asymmetric layout with headline reveal, time-ordered routine timeline,
 * indoor air guide, ranked change cards, commute comparison, community pledges, and map.
 */
export function PlanStep({ planData, household, onBack, onDoseChange }: PlanStepProps) {
  const { t } = useLocale();
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [commuteMode, setCommuteMode] = useState<string | undefined>();
  const [pledges, setPledges] = useState<readonly string[]>([
    "No burning of dry leaves, waste, or plastic",
    "Run the chimney or exhaust fan while cooking",
  ]);

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

  const routineItems = useMemo(
    () => buildRoutine(household, planData.air.forecast, planData.ranked),
    [household, planData.air.forecast, planData.ranked],
  );

  const hasCommute = useMemo(
    () => household.members.some((m) => m.windows.some((w) => w.activity.startsWith("commute_"))),
    [household.members],
  );

  useEffect(() => {
    onDoseChange?.(currentTotal, baselineTotal);
  }, [currentTotal, baselineTotal, onDoseChange]);

  const handleToggle = (id: string, active: boolean) => {
    setActiveIds((prev) => (active ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  return (
    <div className={styles.layout}>
      <button type="button" onClick={onBack} className={styles.backButton}>
        {t("plan_back_btn")}
      </button>

      <PlanHeadline
        baselineTotal={baselineTotal}
        currentTotal={currentTotal}
        activeCount={activeIds.length}
        animatedBaseline={animatedBaseline}
        maxPotentialSavingsPct={maxPotentialSavingsPct}
        currentSavedPct={currentSavedPct}
        currentSavedUg={currentSavedUg}
      />

      <div className={styles.fullRow}>
        <AirToday air={planData.air.current} />
      </div>

      <div className={styles.fullRow}>
        <PlanActions
          planData={planData}
          household={household}
          currentTotal={currentTotal}
          routine={routineItems}
          commuteMode={commuteMode}
          pledges={pledges}
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

        <IndoorAirSection outdoorPm25={planData.air.current.pm25} />

        <section className={styles.cardsSection} aria-labelledby="ranked-changes-title">
          <h3 id="ranked-changes-title" className={styles.cardsTitle}>
            {t("plan_changes_heading", { count: planData.ranked.length })}
          </h3>
          {planData.ranked.length === 0 ? (
            <p className={styles.emptyCards}>
              {t("plan_no_effective_changes")}
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

        {hasCommute && (
          <CommuteCompare
            outdoorPm25={planData.air.current.pm25}
            activeInterventionIds={activeIds}
            onApplyIntervention={(id) => handleToggle(id, true)}
            onSelectMode={(m) => setCommuteMode(m.label)}
          />
        )}

        <CommunityPledge
          areaLabel={household.location.label}
          onPledgesChanged={(p) => setPledges(p)}
        />
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
