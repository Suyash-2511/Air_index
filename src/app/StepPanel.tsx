"use client";

import { LandingHero } from "@/components/landing";
import { PlanStep, WhereStep, WhoStep } from "@/components/steps";
import { DELHI_DEMO_LOCATION } from "@/data";
import { type HomeFlow, type LiveHome, useLocale } from "@/hooks";
import styles from "./page.module.css";

interface StepPanelProps {
  flow: HomeFlow;
  /** The visitor's own position and the air there. */
  home: LiveHome;
  /** Outdoor PM2.5 to show on the landing page, from the plan once there is one. */
  livePm25: number | undefined;
}

/** First part of a "City, State" label, which is all the landing headline has room for. */
const cityOf = (label: string): string => label.split(",")[0] ?? label;

function LoadingBanner() {
  const { t } = useLocale();
  return (
    <div className={styles.loadingBanner} aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <span>{t("loading_calculating_plan")}</span>
    </div>
  );
}

function Landing({ flow, home, livePm25 }: StepPanelProps) {
  const { liveLocation } = home;
  const cityProps = liveLocation ? { cityName: cityOf(liveLocation.label), isLive: true } : {};
  return (
    <LandingHero
      livePm25={livePm25}
      aqi={flow.planData?.air.current.aqi ?? home.air?.aqi}
      {...cityProps}
      onPlanHome={() => flow.goToStep(1)}
      onSampleFamily={() => flow.confirmLocation(DELHI_DEMO_LOCATION, true)}
    />
  );
}

/** The step the visitor is on, or the loading banner while a plan is being worked out. */
export function StepPanel(props: StepPanelProps) {
  const { flow } = props;
  const { liveLocation } = props.home;
  const { step, location, household, planData } = flow;

  if (step === 0) return <Landing {...props} />;
  if (flow.isLoading) return <LoadingBanner />;

  if (step === 1) {
    return <WhereStep initialLocation={location} liveLocation={liveLocation} onLocationConfirmed={flow.confirmLocation} />;
  }
  if (step === 2 && location) {
    return (
      <WhoStep
        location={location}
        initialHousehold={household}
        initialAssumed={flow.assumedNotes}
        onBuildPlan={flow.buildPlan}
        onBack={() => flow.goToStep(1)}
      />
    );
  }
  if (step === 3 && planData && household) {
    return <PlanStep planData={planData} household={household} onBack={() => flow.goToStep(2)} onDoseChange={flow.changeDose} />;
  }
  return null;
}
