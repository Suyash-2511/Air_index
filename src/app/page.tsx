"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { Masthead } from "@/components/landing";
import { StaticFallback } from "@/components/scene";
import { StepNav } from "@/components/steps";
import { type HomeFlow, type HomeStep, type LiveHome, useHomeFlow, useLiveHome, useLocale, useTheme } from "@/hooks";
import { StepPanel } from "./StepPanel";
import styles from "./page.module.css";

const loadScene = () => import("@/components/scene/AirScene").then((module) => module.AirScene);

// The still Earth shows at first paint while the 3D chunk streams in behind it.
const AirScene = dynamic(loadScene, { ssr: false, loading: () => <StaticFallback /> });

// Start fetching the 3D chunk as soon as this module runs, not after hydration.
if (typeof window !== "undefined") void loadScene();

const LANDING_STEP = 0;
const PLAN_STEP = 3;

/** Landing shows the globe beside the headline; the plan gives the page over to a full-width layout. */
function layoutClassFor(step: HomeStep): string {
  if (step === PLAN_STEP) return styles.contentLayoutFull ?? "";
  return (step === LANDING_STEP ? styles.contentLayoutHero : styles.contentLayout) ?? "";
}

/** Moves keyboard focus to the new step's heading so screen readers announce the change. */
function useFocusStepHeading(step: HomeStep) {
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [step]);
  return mainRef;
}

interface HomeSceneProps {
  flow: HomeFlow;
  home: LiveHome;
  /** Outdoor PM2.5 to tint the still fallback with. */
  pm25: number | undefined;
  /** On the plan page the globe moves to the corner instead of sitting beside the form. */
  isCorner: boolean;
}

/** The Earth beside the form, turned to the chosen city once there is one. */
function HomeScene({ flow, home, pm25, isCorner }: HomeSceneProps) {
  const { location } = flow;
  const place = location ?? home.liveLocation;
  return (
    <div className={isCorner ? styles.sceneContainerCorner : styles.sceneContainer}>
      <AirScene
        lat={place?.lat ?? home.lat}
        lng={place?.lng ?? home.lng}
        cityName={place?.label ?? "New Delhi"}
        pm25={pm25}
        density={flow.doseDensity}
        focused={flow.step > LANDING_STEP && location !== undefined}
      />
    </div>
  );
}

/** Coordinator for Saans: light theme by default, with the Three.js Earth centrepiece. */
export default function HomePage() {
  const { locale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const flow = useHomeFlow(locale);
  const home = useLiveHome();
  const { step } = flow;
  const mainRef = useFocusStepHeading(step);
  const pm25 = flow.planData?.air.current.pm25 ?? home.air?.pm25;

  return (
    <div className={styles.pageWrapper}>
      <Masthead theme={theme} onToggleTheme={toggleTheme} compact={step !== LANDING_STEP} />
      {step !== LANDING_STEP && <StepNav currentStep={step} />}
      {flow.error && <div className={styles.errorBanner} role="alert">{flow.error}</div>}

      <main id="main-content" ref={mainRef} className={styles.mainContent}>
        <div className={layoutClassFor(step)}>
          <div className={styles.panelContainer}>
            <StepPanel flow={flow} home={home} livePm25={pm25} />
          </div>
          <HomeScene flow={flow} home={home} pm25={pm25} isCorner={step === PLAN_STEP} />
        </div>
      </main>
    </div>
  );
}
