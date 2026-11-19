"use client";

import { useState } from "react";
import { useLocale } from "@/hooks";
import { IconShare } from "../ui";
import styles from "./CommunityPledge.module.css";
import { DEFAULT_PLEDGE_IDS, PLEDGES, type PledgeDefinition } from "./pledges";
import { usePledgeSharing } from "./usePledgeSharing";

/** Props for the CommunityPledge section. */
interface CommunityPledgeProps {
  areaLabel: string;
  onPledgesChanged?: ((pledgeTitles: readonly string[]) => void) | undefined;
}

interface PledgeItemProps {
  pledge: PledgeDefinition;
  isChecked: boolean;
  onToggle: (id: string) => void;
}

function PledgeItem({ pledge, isChecked, onToggle }: PledgeItemProps) {
  const { t } = useLocale();
  return (
    <label className={styles.pledgeItem} data-checked={isChecked}>
      <input type="checkbox" checked={isChecked} onChange={() => onToggle(pledge.id)} className={styles.checkbox} />
      <div className={styles.pledgeContent}>
        <span className={styles.pledgeTitle}>{t(pledge.titleKey)}</span>
        <span className={styles.pledgeEffect}>{t(pledge.effectKey)}</span>
      </div>
    </label>
  );
}

/**
 * Interactive community pledge list allowing families to commit to clean-air actions and share them.
 */
export function CommunityPledge({ areaLabel, onPledgesChanged }: CommunityPledgeProps) {
  const { t } = useLocale();
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(DEFAULT_PLEDGE_IDS);
  const { statusMessage, share } = usePledgeSharing();

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id];
    setSelectedIds(next);
    onPledgesChanged?.(next.map((pledgeId) => PLEDGES.find((pledge) => pledge.id === pledgeId)?.title ?? pledgeId));
  };

  const shareChosen = () => {
    const chosen = PLEDGES.filter((pledge) => selectedIds.includes(pledge.id));
    share([t("pledge_share_lead", { area: areaLabel }), ...chosen.map((pledge) => `• ${t(pledge.titleKey)}`), "", t("pledge_share_footer")].join("\n"));
  };

  return (
    <section className={styles.container} aria-labelledby="community-pledge-heading">
      <header className={styles.header}>
        <h3 id="community-pledge-heading" className={styles.title}>
          {t("pledge_heading")}
        </h3>
        <p className={styles.subtitle}>{t("pledge_subtitle")}</p>
      </header>

      <div className={styles.pledgeList}>
        {PLEDGES.map((pledge) => (
          <PledgeItem key={pledge.id} pledge={pledge} isChecked={selectedIds.includes(pledge.id)} onToggle={toggle} />
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={shareChosen} className={styles.shareBtn}>
          <IconShare size={16} />
          {t("pledge_share_btn")}
        </button>
        <span className={styles.announcement} aria-live="polite">
          {statusMessage}
        </span>
      </div>
    </section>
  );
}
