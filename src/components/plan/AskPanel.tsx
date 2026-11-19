"use client";

import type { AskApiResponse } from "@/client/types";
import { useAskQuestion } from "@/hooks";
import { useLocale } from "@/hooks";
import type { Household } from "@/lib/types";
import styles from "./AskPanel.module.css";

/** Props for the AskPanel assistant component. */
interface AskPanelProps {
  household: Household;
}

/** The answer with the question it answers and the plan changes it cites. */
function AnswerBox({ answer, asked }: { answer: AskApiResponse; asked: string | undefined }) {
  const { t } = useLocale();
  return (
    <div className={styles.answerBox} aria-live="polite">
      {asked && <p className={styles.asked}>{t("ask_you_asked", { q: asked })}</p>}
      <p>{answer.answer}</p>
      {answer.citations.length > 0 && (
        <div className={styles.citations}>
          <span>{t("ask_cited_actions")}</span>
          {answer.citations.map((citation) => (
            <span key={citation} className={styles.citationTag}>
              {citation}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Q&A panel grounded exclusively in the family's computed exposure plan.
 * Answers specific user questions via /api/ask with aria-live announcements and citations,
 * while maintaining a permanent medical disclaimer.
 */
export function AskPanel({ household }: AskPanelProps) {
  const { t } = useLocale();
  const ask = useAskQuestion(household);

  return (
    <section className={styles.panel} aria-labelledby="ask-panel-title">
      <h3 id="ask-panel-title" className={styles.title}>
        {t("ask_title")}
      </h3>
      <p className={styles.description}>{t("ask_subtitle")}</p>

      <form onSubmit={ask.submit} className={styles.form}>
        <label htmlFor="ask-input" className="sr-only">
          {t("ask_input_aria")}
        </label>
        <input
          id="ask-input"
          type="text"
          value={ask.question}
          onChange={(event) => ask.setQuestion(event.target.value)}
          placeholder={ask.answer ? t("ask_placeholder_again") : t("ask_placeholder_default")}
          disabled={ask.isLoading}
          className={styles.input}
        />
        <button type="submit" disabled={ask.isLoading || !ask.question.trim()} className={styles.button}>
          {ask.isLoading ? t("ask_btn_loading") : t("ask_btn")}
        </button>
      </form>

      {ask.error && (
        <div className={styles.answerBox} role="alert">
          {ask.error}
        </div>
      )}
      {ask.answer && <AnswerBox answer={ask.answer} asked={ask.asked} />}

      <footer className={styles.disclaimer}>
        <strong>{t("ask_disclaimer_title")}</strong> {t("ask_disclaimer_body")}
      </footer>
    </section>
  );
}
