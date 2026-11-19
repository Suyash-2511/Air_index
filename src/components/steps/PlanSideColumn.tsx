"use client";

import type { PlanApiResponse } from "@/client/types";
import type { PlanState } from "@/hooks";
import type { Household } from "@/lib/types";
import { AreaMap, AskPanel, DayStrip } from "../plan";
import styles from "./PlanStep.module.css";

interface PlanSideColumnProps {
  household: Household;
  planData: PlanApiResponse;
  plan: PlanState;
}

/** The map, the day's dose bars and the question box, beside the routine and the change cards. */
export function PlanSideColumn({ household, planData, plan }: PlanSideColumnProps) {
  const { lat, lng, label } = household.location;
  return (
    <div className={styles.rightColumn}>
      <AreaMap lat={lat} lng={lng} label={label} />
      <DayStrip
        household={household}
        baselineDoses={planData.baseline}
        currentDoses={plan.currentDoses}
        hasChangesActive={plan.activeIds.length > 0}
      />
      <AskPanel household={household} />
    </div>
  );
}
