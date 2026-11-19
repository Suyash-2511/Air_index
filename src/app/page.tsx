"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { computePlan, fetchCurrentAir, type CurrentAirReading } from "@/client/api";
import type { PlanApiResponse } from "@/client/types";
import { LandingHero, Masthead } from "@/components/landing";
import { PlanStep, StepNav, WhereStep, WhoStep, type StepNumber } from "@/components/steps";
import { getDefaultHousehold, getSampleHousehold } from "@/data/sampleHousehold";
import { useBrowserLocation } from "@/hooks/useBrowserLocation";
import { StaticFallback } from "@/components/scene/StaticFallback";
import type { Household, Location } from "@/lib/types";
import styles from "./page.module.css";

const loadScene = () => import("@/components/scene/AirScene").then((m) => m.AirScene);

// The still Earth shows at first paint while the 3D chunk streams in behind it.
const AirScene = dynamic(loadScene, { ssr: false, loading: () => <StaticFallback /> });

// Start fetching the 3D chunk as soon as this module runs, not after hydration.
if (typeof window !== "undefined") void loadScene();

const DELHI_LOCATION: Location = {
  lat: 28.6139,
  lng: 77.209,
  label: "Connaught Place, New Delhi, Delhi",
};

/** Coordinator for Saans: light theme by default, with the Three.js Earth centrepiece. */
export default function HomePage() {
  const [step, setStep] = useState<0 | StepNumber>(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [location, setLocation] = useState<Location | undefined>();
  const [household, setHousehold] = useState<Household | undefined>();
  const [assumedNotes, setAssumedNotes] = useState<readonly string[]>([]);
  const [planData, setPlanData] = useState<PlanApiResponse | undefined>();
  const [doseDensity, setDoseDensity] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [landingAir, setLandingAir] = useState<CurrentAirReading | undefined>();
  const [liveLocation, setLiveLocation] = useState<Location | undefined>();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [step]);

  // Live location is the default; New Delhi stands in until it is known or when it is blocked.
  useBrowserLocation({ onLocationResolved: setLiveLocation });
  const homeLat = liveLocation?.lat ?? DELHI_LOCATION.lat;
  const homeLng = liveLocation?.lng ?? DELHI_LOCATION.lng;

  useEffect(() => {
    let cancelled = false;
    setLandingAir(undefined);
    void fetchCurrentAir(homeLat, homeLng).then((value) => {
      if (!cancelled) setLandingAir(value);
    });
    return () => {
      cancelled = true;
    };
  }, [homeLat, homeLng]);

  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));

  const handleLocationConfirmed = (loc: Location, isDemo = false) => {
    setLocation(loc);
    setError(undefined);
    if (isDemo) {
      setHousehold(getSampleHousehold(loc));
      setAssumedNotes(["No air purifier in the home", "No kitchen exhaust fan"]);
    } else {
      setHousehold(getDefaultHousehold(loc));
      setAssumedNotes([]);
    }
    setStep(2);
  };

  const handleBuildPlan = async (currentHousehold: Household) => {
    setHousehold(currentHousehold);
    setLoading(true);
    setError(undefined);
    try {
      const data = await computePlan(currentHousehold);
      setPlanData(data);
      setDoseDensity(1.0);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to calculate exposure plan");
    } finally {
      setLoading(false);
    }
  };

  const currentPm25 = planData?.air.current.pm25 ?? landingAir?.pm25;
  const currentAqi = planData?.air.current.aqi ?? landingAir?.aqi;

  return (
    <div className={styles.pageWrapper}>
      <Masthead theme={theme} onToggleTheme={toggleTheme} compact={step > 0} />

      {step > 0 && <StepNav currentStep={step as StepNumber} />}
      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      <main id="main-content" ref={mainRef} className={styles.mainContent}>
        <div className={step === 3 ? styles.contentLayoutFull : step === 0 ? styles.contentLayoutHero : styles.contentLayout}>
          <div className={styles.panelContainer}>
            {step === 0 && (
              <LandingHero
                livePm25={currentPm25}
                aqi={currentAqi}
                {...(liveLocation ? { cityName: liveLocation.label.split(",")[0] ?? liveLocation.label, isLive: true } : {})}
                onPlanHome={() => setStep(1)}
                onSampleFamily={() => handleLocationConfirmed(DELHI_LOCATION, true)}
              />
            )}

            {loading && (
              <div className={styles.loadingBanner} aria-live="polite" aria-busy="true">
                <div className={styles.spinner} aria-hidden="true" />
                <span>Calculating daily inhaled doses and ranking protective changes...</span>
              </div>
            )}

            {!loading && step === 1 && (
              <WhereStep initialLocation={location} liveLocation={liveLocation} onLocationConfirmed={handleLocationConfirmed} />
            )}

            {!loading && step === 2 && location && (
              <WhoStep
                location={location}
                initialHousehold={household}
                initialAssumed={assumedNotes}
                onBuildPlan={handleBuildPlan}
                onBack={() => setStep(1)}
              />
            )}

            {!loading && step === 3 && planData && household && (
              <PlanStep
                planData={planData}
                household={household}
                onBack={() => setStep(2)}
                onDoseChange={(curr, base) => setDoseDensity(base > 0 ? curr / base : 1.0)}
              />
            )}
          </div>

          <div className={step === 3 ? styles.sceneContainerCorner : styles.sceneContainer}>
            <AirScene
              lat={location?.lat ?? homeLat}
              lng={location?.lng ?? homeLng}
              cityName={location?.label ?? liveLocation?.label ?? "New Delhi"}
              pm25={currentPm25}
              density={doseDensity}
              focused={step > 0 && location !== undefined}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
