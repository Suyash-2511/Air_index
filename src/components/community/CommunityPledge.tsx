"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import type { TranslationKey } from "@/lib/i18n";
import { IconShare } from "../ui/icons";
import styles from "./CommunityPledge.module.css";

/** Definition of a community emission reduction pledge. */
export interface PledgeDefinition {
  id: string;
  title: string;
  effect: string;
  titleKey: TranslationKey;
  effectKey: TranslationKey;
}

/** The 4 community pledges targeting household direct emissions. */
export const PLEDGES: readonly PledgeDefinition[] = [
  {
    id: "no_waste_burning",
    title: "No burning of dry leaves, waste, or plastic",
    effect: "Open burning sends smoke straight into the air your street breathes, often at night when it stays trapped near the ground.",
    titleKey: "pledge_no_waste_burning_title",
    effectKey: "pledge_no_waste_burning_effect",
  },
  {
    id: "carpool_or_metro",
    title: "Carpool or take the metro at least twice a week",
    effect: "Fewer cars on the road means less exhaust along your route, and the metro emits far less CO₂ per person than driving alone.",
    titleKey: "pledge_carpool_or_metro_title",
    effectKey: "pledge_carpool_or_metro_effect",
  },
  {
    id: "clean_cooking_fuel",
    title: "Switch away from kerosene or biomass cookstoves",
    effect: "Kerosene and wood smoke is one of the biggest indoor sources of fine particles; LPG, piped gas or induction removes most of it.",
    titleKey: "pledge_clean_cooking_fuel_title",
    effectKey: "pledge_clean_cooking_fuel_effect",
  },
  {
    id: "run_chimney_cooking",
    title: "Run the chimney or exhaust fan while cooking",
    effect: "Pulls cooking smoke and oil fumes out of the kitchen before they spread to the rest of the home.",
    titleKey: "pledge_run_chimney_cooking_title",
    effectKey: "pledge_run_chimney_cooking_effect",
  },
];

/** Props for the CommunityPledge section. */
export interface CommunityPledgeProps {
  areaLabel: string;
  onPledgesChanged?: ((pledgeIds: readonly string[]) => void) | undefined;
}

/**
 * Interactive community pledge list allowing families to commit to clean-air actions and share them.
 */
export function CommunityPledge({ areaLabel, onPledgesChanged }: CommunityPledgeProps) {
  const { t } = useLocale();
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(["no_waste_burning", "run_chimney_cooking"]);
  const [statusMsg, setStatusMsg] = useState("");

  const handleToggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    setSelectedIds(next);
    if (onPledgesChanged) {
      const titles = next.map((pid) => PLEDGES.find((p) => p.id === pid)?.title ?? pid);
      onPledgesChanged(titles);
    }
  };

  const handleShare = async () => {
    const chosenPledges = PLEDGES.filter((p) => selectedIds.includes(p.id));
    const text = [
      t("pledge_share_lead", { area: areaLabel }),
      ...chosenPledges.map((p) => `• ${t(p.titleKey)}`),
      "",
      t("pledge_share_footer"),
    ].join("\n");

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("pledge_share_title"), text });
        setStatusMsg(t("pledge_shared_msg"));
        return;
      } catch {
        // Fall back to clipboard if aborted or failed
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setStatusMsg(t("pledge_copied_msg"));
        setTimeout(() => setStatusMsg(""), 3000);
      } catch {
        setStatusMsg(t("pledge_copy_failed_msg"));
      }
    }
  };

  return (
    <section className={styles.container} aria-labelledby="community-pledge-heading">
      <header className={styles.header}>
        <h3 id="community-pledge-heading" className={styles.title}>
          {t("pledge_heading")}
        </h3>
        <p className={styles.subtitle}>
          {t("pledge_subtitle")}
        </p>
      </header>

      <div className={styles.pledgeList}>
        {PLEDGES.map((pledge) => {
          const isChecked = selectedIds.includes(pledge.id);
          return (
            <label key={pledge.id} className={styles.pledgeItem} data-checked={isChecked}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(pledge.id)}
                className={styles.checkbox}
              />
              <div className={styles.pledgeContent}>
                <span className={styles.pledgeTitle}>{t(pledge.titleKey)}</span>
                <span className={styles.pledgeEffect}>{t(pledge.effectKey)}</span>
              </div>
            </label>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={handleShare} className={styles.shareBtn}>
          <IconShare size={16} />
          {t("pledge_share_btn")}
        </button>
        <span className={styles.announcement} aria-live="polite">
          {statusMsg}
        </span>
      </div>
    </section>
  );
}
