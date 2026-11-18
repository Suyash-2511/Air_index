"use client";

import { useState, type FormEvent } from "react";
import { askPlanQuestion } from "@/client/api";
import type { AskApiResponse } from "@/client/types";
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
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskApiResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(undefined);
    try {
      const resp = await askPlanQuestion(question.trim(), household);
      setResult(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel} aria-labelledby="ask-panel-title">
      <h3 id="ask-panel-title" className={styles.title}>
        Ask About Your Plan
      </h3>
      <p className={styles.description}>
        Ask specific questions about your family members, mask use, purifier settings,
        or commute adjustments.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about your plan
        </label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Should my mother wear a mask?"
          disabled={loading}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className={styles.button}
        >
          {loading ? "Checking plan..." : "Ask"}
        </button>
      </form>

      {error && (
        <div className={styles.answerBox} role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className={styles.answerBox} aria-live="polite">
          <p>{result.answer}</p>
          {result.citations.length > 0 && (
            <div className={styles.citations}>
              <span>Cited actions:</span>
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
        <strong>Medical disclaimer:</strong> Saans provides exposure estimates for planning
        and routine adaptation. It is not medical advice. For severe symptoms, acute respiratory
        distress, or medical emergencies, seek immediate clinical care.
      </footer>
    </div>
  );
}
