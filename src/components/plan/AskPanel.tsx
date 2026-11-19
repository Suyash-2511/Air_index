"use client";

import { useState, type FormEvent } from "react";
import { askPlanQuestion } from "@/client/api";
import type { AskApiResponse } from "@/client/types";
import { useLocale } from "@/hooks/useLocale";
import type { Household } from "@/lib/types";
import styles from "./AskPanel.module.css";

/** Props for the AskPanel assistant component. */
export interface AskPanelProps {
  household: Household;
}

/**
 * Interactive Q&A panel grounded exclusively in the family's computed exposure plan.
 * Answers specific user questions via /api/ask with aria-live announcements and citations,
 * while maintaining a permanent medical disclaimer.
 */
export function AskPanel({ household }: AskPanelProps) {
  const { locale, t } = useLocale();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskApiResponse | undefined>();
  const [asked, setAsked] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(undefined);
    try {
      const q = question.trim();
      const resp = await askPlanQuestion(q, household, locale);
      setResult(resp);
      setAsked(q);
      setQuestion("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="ask-panel-title">
      <h3 id="ask-panel-title" className={styles.title}>
        {t("ask_title")}
      </h3>
      <p className={styles.description}>
        {t("ask_subtitle")}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor="ask-input" className="sr-only">
          {t("ask_input_aria")}
        </label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={result ? t("ask_placeholder_again") : t("ask_placeholder_default")}
          disabled={loading}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className={styles.button}
        >
          {loading ? t("ask_btn_loading") : t("ask_btn")}
        </button>
      </form>

      {error && (
        <div className={styles.answerBox} role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className={styles.answerBox} aria-live="polite">
          {asked && <p className={styles.asked}>{t("ask_you_asked", { q: asked })}</p>}
          <p>{result.answer}</p>
          {result.citations.length > 0 && (
            <div className={styles.citations}>
              <span>{t("ask_cited_actions")}</span>
              {result.citations.map((cite, idx) => (
                <span key={idx} className={styles.citationTag}>
                  {cite}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className={styles.disclaimer}>
        <strong>{t("ask_disclaimer_title")}</strong> {t("ask_disclaimer_body")}
      </footer>
    </section>
  );
}
