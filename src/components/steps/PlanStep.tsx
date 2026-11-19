"use client";

import type { PlanApiResponse } from "@/client/types";
import { useLocale, usePlanState } from "@/hooks";
import type { Household } from "@/lib/types";
import { CommunityPledge } from "../community";
import { CommuteCompare } from "../commute";
import { AirToday, IndoorAirSection, PlanActions, RoutineTimeline } from "../plan";
import { PlanChanges } from "./PlanChanges";
import { PlanHeadline } from "./PlanHeadline";
import { PlanSideColumn } from "./PlanSideColumn";
import styles from "./PlanStep.module.css";

/** Props for Step 3: Your plan. */
interface PlanStepProps {
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
  const plan = usePlanState({ planData, household, onDoseChange });
  const outdoorPm25 = planData.air.current.pm25;

  return (
    <div className={styles.layout}>
      <button type="button" onClick={onBack} className={styles.backButton}>
        {t("plan_back_btn")}
      </button>

      <PlanHeadline
        baselineTotal={plan.baselineTotal}
        currentTotal={plan.currentTotal}
        activeCount={plan.activeIds.length}
        animatedBaseline={plan.animatedBaseline}
        maxPotentialSavingsPct={plan.maxPotentialSavingsPct}
        currentSavedPct={plan.currentSavedPct}
        currentSavedUg={plan.currentSavedUg}
      />

      <div className={styles.fullRow}>
        <AirToday air={planData.air.current} />
      </div>

      <div className={styles.fullRow}>
        <PlanActions
          planData={planData}
          household={household}
          currentTotal={plan.currentTotal}
          routine={plan.routineItems}
          commuteMode={plan.commuteMode}
          pledges={plan.pledges}
        />
      </div>

      <div className={styles.leftColumn}>
        <RoutineTimeline
          items={plan.routineItems}
          areaLabel={household.location.label}
          household={household}
          activeIds={plan.activeIds}
          onToggleIntervention={plan.toggleChange}
        />
        <IndoorAirSection outdoorPm25={outdoorPm25} />
        <PlanChanges ranked={planData.ranked} activeIds={plan.activeIds} onToggle={plan.toggleChange} />
        {plan.hasCommute && (
          <CommuteCompare
            outdoorPm25={outdoorPm25}
            activeInterventionIds={plan.activeIds}
            onApplyIntervention={(id) => plan.toggleChange(id, true)}
            onSelectMode={(mode) => plan.chooseCommuteMode(mode.label)}
          />
        )}
        <CommunityPledge areaLabel={household.location.label} onPledgesChanged={plan.setPledges} />
      </div>

      <PlanSideColumn household={household} planData={planData} plan={plan} />
    </div>
  );
}
