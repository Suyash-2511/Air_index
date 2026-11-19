"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { PlanApiResponse } from "@/client/types";
import { useReadAloud } from "@/hooks";
import { useLocale } from "@/hooks";
import { buildCommunityBrief, buildReadAloudScript } from "@/lib/brief";
import type { RoutineItem } from "@/lib/routine";
import type { Household } from "@/lib/types";
import { IconCopy, IconPrint, IconShare, IconSpeaker, IconStop } from "../ui";
import { buildBriefInput } from "./brief-input";
import styles from "./PlanActions.module.css";

/** How long the "copied" message stays in the live region before it is cleared. */
const ANNOUNCEMENT_MS = 3000;
const ACTION_ICON_SIZE = 15;

/** Props for the PlanActions export and sharing bar. */
interface PlanActionsProps {
  planData: PlanApiResponse;
  household: Household;
  currentTotal: number;
  routine?: readonly RoutineItem[] | undefined;
  commuteMode?: string | undefined;
  pledges?: readonly string[] | undefined;
}

interface ActionButtonProps {
  icon: ComponentType<{ size?: number; className?: string | undefined }>;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <button type="button" onClick={onClick} className={styles.actionButton} aria-label={label}>
      <Icon size={ACTION_ICON_SIZE} className={styles.icon} />
      <span>{label}</span>
    </button>
  );
}

/** Whether this browser can open its native share sheet; checked after mount so server and client agree. */
function useCanShare(): boolean {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);
  return canShare;
}

/**
 * Row of quiet secondary action buttons to read aloud, copy a community brief,
 * share, or print the current exposure reduction plan.
 */
export function PlanActions(props: PlanActionsProps) {
  const { locale, t } = useLocale();
  const [announcement, setAnnouncement] = useState("");
  const brief = buildBriefInput({ ...props, locale });
  const speech = useReadAloud(() => buildReadAloudScript(brief), locale === "hi" ? "hi-IN" : "en-IN");
  const canShare = useCanShare();

  const copy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(buildCommunityBrief(brief));
      setAnnouncement(t("brief_copied"));
      setTimeout(() => setAnnouncement(""), ANNOUNCEMENT_MS);
    } catch {
      // Clipboard access can be refused by the browser; the button simply does nothing then.
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Air today in ${brief.areaLabel}`, text: buildCommunityBrief(brief) });
    } catch {
      // Closing the share sheet rejects the promise; that is a choice, not a failure.
    }
  };

  return (
    <div className={styles.actionsRow}>
      {speech.canSpeak && (
        <ActionButton
          icon={speech.isSpeaking ? IconStop : IconSpeaker}
          label={speech.isSpeaking ? t("stop_reading") : t("read_aloud")}
          onClick={speech.toggle}
        />
      )}
      <ActionButton icon={IconCopy} label={t("copy_brief")} onClick={copy} />
      {canShare && <ActionButton icon={IconShare} label={t("share_btn")} onClick={share} />}
      <ActionButton icon={IconPrint} label={t("print_btn")} onClick={() => window.print()} />

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
