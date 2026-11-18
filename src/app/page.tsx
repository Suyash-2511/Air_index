"use client";

import { useEffect, useRef, useState } from "react";
import { computePlan } from "@/client/api";
import type { PlanApiResponse } from "@/client/types";
import { PlanStep } from "@/components/PlanStep";
import { StepNav, type StepNumber } from "@/components/StepNav";
import { WhereStep } from "@/components/WhereStep";
import { getDefaultHousehold, WhoStep } from "@/components/WhoStep";
import type { Household, Location } from "@/lib/types";
import styles from "./page.module.css";

/**
 * Main application coordinator for Saans.
 * Manages the linear 3-step state progression: Location -> Household -> Plan,
 * with strict focus management, aria-live announcements, and theme switching.
 */
export default function HomePage() {
  const [step, setStep] = useState<StepNumber>(1);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [location, setLocation] = useState<Location | undefined>();
  const [household, setHousehold] = useState<Household | undefined>();
  const [assumedNotes, setAssumedNotes] = useState<readonly string[]>([]);
  const [planData, setPlanData] = useState<PlanApiResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Focus management on step transitions
  useEffect(() => {
    if (mainRef.current) {
      const heading = mainRef.current.querySelector<HTMLElement>("h2");
      if (heading) heading.focus();
    }
  }, [step]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleLocationConfirmed = (loc: Location, isDemo = false) => {
    setLocation(loc);
    setError(undefined);
    if (isDemo) {
      setHousehold({
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
      });
      setAssumedNotes([
        "No air purifier in the home (defaulted to none)",
        "No kitchen exhaust fan (defaulted to none)",
      ]);
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
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to calculate exposure plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.siteTitle}>Saans</h1>
          <span className={styles.siteSubtitle}>Smog Exposure Field Notebook</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeButton}
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </header>

      <StepNav currentStep={step} />

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <main id="main-content" ref={mainRef} className={styles.mainContent}>
        {loading && (
          <div className={styles.loadingBanner} aria-live="polite" aria-busy="true">
            <div className={styles.spinner} aria-hidden="true" />
            <span>Calculating daily inhaled doses and ranking protective changes...</span>
          </div>
        )}

        {!loading && step === 1 && (
          <WhereStep
            initialLocation={location}
            onLocationConfirmed={handleLocationConfirmed}
          />
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
          />
        )}
      </main>
    </div>
  );
}
