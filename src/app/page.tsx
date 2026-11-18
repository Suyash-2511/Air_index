"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { computePlan, fetchCurrentPm25 } from "@/client/api";
import type { PlanApiResponse } from "@/client/types";
import { IconMoon, IconSun } from "@/components/icons";
import { LandingHero } from "@/components/LandingHero";
import { PlanStep } from "@/components/PlanStep";
import { StepNav, type StepNumber } from "@/components/StepNav";
import { WhereStep } from "@/components/WhereStep";
import { getDefaultHousehold, WhoStep } from "@/components/WhoStep";
import type { Household, Location } from "@/lib/types";
import styles from "./page.module.css";

const AirScene = dynamic(
  () => import("@/components/scene/AirScene").then((m) => m.AirScene),
  { ssr: false }
);

const DELHI_LOCATION: Location = {
  lat: 28.6139,
  lng: 77.209,
  label: "Connaught Place, New Delhi, Delhi",
};

function getSampleHousehold(loc: Location): Household {
  return {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 120, room: "living", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 780, room: "living", mask: false },
        ],
      },
      {
        id: "m-mother",
        label: "Mother",
        ageBand: "older_adult",
        sensitivities: ["asthma"],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
        ],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: loc,
  };
}

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
  const [landingPm25, setLandingPm25] = useState<number | undefined>();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    mainRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [step]);

  // Live reading for the landing page, so the number shown is real, not a placeholder.
  useEffect(() => {
    let cancelled = false;
    void fetchCurrentPm25(DELHI_LOCATION.lat, DELHI_LOCATION.lng).then((value) => {
      if (!cancelled) setLandingPm25(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const currentPm25 = planData?.air.current.pm25 ?? landingPm25;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.siteTitle}>Saans</h1>
          <span className={styles.siteSubtitle}>Winter air, measured for your family</span>
        </div>
        <button type="button" onClick={toggleTheme} className={styles.themeButton}>
          {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          <span className="sr-only">{theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}</span>
        </button>
      </header>

      {step > 0 && <StepNav currentStep={step as StepNumber} />}
      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      <main id="main-content" ref={mainRef} className={styles.mainContent}>
        <div
          className={
            step === 3 ? styles.contentLayoutFull : step === 0 ? styles.contentLayoutHero : styles.contentLayout
          }
        >
          <div className={styles.panelContainer}>
            {step === 0 && (
              <LandingHero
                livePm25={currentPm25}
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
              <WhereStep initialLocation={location} onLocationConfirmed={handleLocationConfirmed} />
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
              lat={location?.lat ?? 28.6139}
              lng={location?.lng ?? 77.209}
              cityName={location?.label ?? "New Delhi"}
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
