"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanApiResponse } from "@/client/types";
import { useLocale } from "@/hooks/useLocale";
import { type BriefInput, buildCommunityBrief, buildReadAloudScript } from "@/lib/brief";
import type { RoutineItem } from "@/lib/routine/build-routine";
import type { Household } from "@/lib/types";
import { IconCopy, IconPrint, IconShare, IconSpeaker, IconStop } from "../ui/icons";
import { getInterventionTitle } from "./plan-sharing";
import styles from "./PlanActions.module.css";

/** Props for the PlanActions export and sharing bar. */
export interface PlanActionsProps {
  planData: PlanApiResponse;
  household: Household;
  currentTotal: number;
  routine?: readonly RoutineItem[] | undefined;
  commuteMode?: string | undefined;
  pledges?: readonly string[] | undefined;
}

/**
 * Row of quiet secondary action buttons to read aloud, copy a community brief,
 * share, or print the current exposure reduction plan.
 */
export function PlanActions({
  planData,
  household,
  currentTotal,
  routine,
  commuteMode,
  pledges,
}: PlanActionsProps) {
  const { locale, t } = useLocale();
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
      commuteMode,
      pledges,
      locale,
    };
  }, [household.location.label, planData, currentTotal, routine, commuteMode, pledges, locale]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) setCanSpeak(true);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") setCanShare(true);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
    utterance.lang = locale === "hi" ? "hi-IN" : "en-IN";
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
      setAnnouncement(t("brief_copied"));
      setTimeout(() => setAnnouncement(""), 3000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      const text = buildCommunityBrief(briefInput);
      await navigator.share({ title: `Air today in ${briefInput.areaLabel}`, text });
    } catch {
      // Ignore share abort
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className={styles.actionsRow}>
      {canSpeak && (
        <button
          type="button"
          onClick={handleToggleSpeech}
          className={styles.actionButton}
          aria-label={isSpeaking ? t("stop_reading") : t("read_aloud")}
        >
          {isSpeaking ? (
            <>
              <IconStop size={15} className={styles.icon} />
              <span>{t("stop_reading")}</span>
            </>
          ) : (
            <>
              <IconSpeaker size={15} className={styles.icon} />
              <span>{t("read_aloud")}</span>
            </>
          )}
        </button>
      )}

      <button type="button" onClick={handleCopy} className={styles.actionButton}>
        <IconCopy size={15} className={styles.icon} />
        <span>{t("copy_brief")}</span>
      </button>

      {canShare && (
        <button type="button" onClick={handleShare} className={styles.actionButton}>
          <IconShare size={15} className={styles.icon} />
          <span>{t("share_btn")}</span>
        </button>
      )}

      <button type="button" onClick={handlePrint} className={styles.actionButton}>
        <IconPrint size={15} className={styles.icon} />
        <span>{t("print_btn")}</span>
      </button>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
