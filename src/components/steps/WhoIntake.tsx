"use client";

import { useLocale } from "@/hooks";
import styles from "./WhoStep.module.css";

interface WhoIntakeProps {
  sentence: string;
  isReading: boolean;
  onSentenceChange: (sentence: string) => void;
  onRead: () => void;
}

/** A free-text box where the visitor describes the household and the routine is read out of it. */
export function WhoIntake({ sentence, isReading, onSentenceChange, onRead }: WhoIntakeProps) {
  const { t } = useLocale();
  return (
    <div className={styles.intakeBox}>
      <label htmlFor="intake-textarea" className={styles.description}>
        {t("who_intake_label")}
      </label>
      <textarea
        id="intake-textarea"
        value={sentence}
        onChange={(event) => onSentenceChange(event.target.value)}
        placeholder={t("who_intake_placeholder")}
        className={styles.textarea}
      />
      <button type="button" onClick={onRead} disabled={isReading || !sentence.trim()} className={styles.buttonSecondary}>
        {isReading ? t("who_reading_routine") : t("who_parse_btn")}
      </button>
    </div>
  );
}

/** What the reading of the sentence had to guess, so the visitor can correct it below. */
export function AssumedList({ notes }: { notes: readonly string[] }) {
  const { t } = useLocale();
  if (notes.length === 0) return null;
  return (
    <div className={styles.assumedList} role="region" aria-label={t("who_assumed_region")}>
      <span className={styles.assumedTitle}>{t("who_assumed_title")}</span>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
