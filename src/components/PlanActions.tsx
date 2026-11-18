"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanApiResponse } from "@/client/types";
import { type BriefInput, buildCommunityBrief, buildReadAloudScript } from "@/lib/brief";
import type { RoutineItem } from "@/lib/routine/build-routine";
import type { Household } from "@/lib/types";
import { IconCopy, IconPrint, IconShare, IconSpeaker, IconStop } from "./icons";
import styles from "./PlanActions.module.css";

/** Props for the PlanActions component. */
export interface PlanActionsProps {
  planData: PlanApiResponse;
  household: Household;
  currentTotal: number;
  routine?: readonly RoutineItem[];
}

const INTERVENTION_TITLES: Record<string, string> = {
  hepa_purifier_bedroom: "Run HEPA air purifier in bedroom",
  hepa_purifier_living: "Run HEPA air purifier in living area",
  n95_mask_commute: "Wear N95/FFP2 mask during commute",
  n95_mask_outdoor: "Wear N95/FFP2 mask during outdoor chores",
  seal_doors_windows: "Weatherstrip doors and windows",
  cleaner_cooking_fuel: "Switch to cleaner cooking fuel",
  kitchen_exhaust_fan: "Use kitchen exhaust fan while cooking",
  shift_outdoor_exercise_afternoon: "Shift outdoor exercise to afternoon",
  shift_commute_time: "Shift commute timing",
  avoid_outdoor_play_peak: "Avoid outdoor play during peak smog hours",
};

function getInterventionTitle(id: string): string {
  const match = INTERVENTION_TITLES[id];
  if (match) return match;
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Row of quiet secondary action buttons to read aloud, copy a community brief,
 * share, or print the current exposure reduction plan.
 */
export function PlanActions({ planData, household, currentTotal, routine }: PlanActionsProps) {
  const [canSpeak, setCanSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const briefInput: BriefInput = useMemo(() => {
    return {
      areaLabel: household.location.label,
      date: new Date(),
      forecast: planData.air.forecast,
      householdMicrograms: currentTotal,
      changes: planData.ranked.map((action) => ({
        title: action.explanation?.title ?? getInterventionTitle(action.id),
        savedPercent: action.savedPercent,
        reducesOwnEmissions: action.reducesOwnEmissions,
      })),
      routine,
    };
  }, [household.location.label, planData, currentTotal, routine]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setCanSpeak(true);
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = () => {
    if (!canSpeak || typeof window === "undefined") return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const text = buildReadAloudScript(briefInput);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      const text = buildCommunityBrief(briefInput);
      await navigator.clipboard.writeText(text);
      setAnnouncement("Brief copied");
      setTimeout(() => setAnnouncement(""), 3000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      const text = buildCommunityBrief(briefInput);
      await navigator.share({
        title: `Air today in ${briefInput.areaLabel}`,
        text,
      });
    } catch {
      // Ignore share abort
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className={styles.actionsRow}>
      {canSpeak && (
        <button
          type="button"
          onClick={handleToggleSpeech}
          className={styles.actionButton}
          aria-label={isSpeaking ? "Stop read aloud" : "Read aloud"}
        >
          {isSpeaking ? (
            <>
              <IconStop size={15} className={styles.icon} />
              <span>Stop</span>
            </>
          ) : (
            <>
              <IconSpeaker size={15} className={styles.icon} />
              <span>Read aloud</span>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className={styles.actionButton}
      >
        <IconCopy size={15} className={styles.icon} />
        <span>Copy community brief</span>
      </button>

      {canShare && (
        <button
          type="button"
          onClick={handleShare}
          className={styles.actionButton}
        >
          <IconShare size={15} className={styles.icon} />
          <span>Share</span>
        </button>
      )}

      <button
        type="button"
        onClick={handlePrint}
        className={styles.actionButton}
      >
        <IconPrint size={15} className={styles.icon} />
        <span>Print plan</span>
      </button>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
