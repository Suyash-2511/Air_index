"use client";

import { type FormEvent, useState } from "react";
import { askPlanQuestion } from "@/client/api";
import type { AskApiResponse } from "@/client/types";
import type { Household } from "@/lib/types";
import { useLocale } from "./useLocale";

/** Shown when the answer request fails with something that has no message of its own. */
const ASK_FAILED_MESSAGE = "Failed to answer question";

/** The question box and the latest answer for one household's plan. */
export function useAskQuestion(household: Household) {
  const { locale } = useLocale();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskApiResponse | undefined>();
  const [asked, setAsked] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(undefined);
    try {
      setAnswer(await askPlanQuestion(trimmed, household, locale));
      setAsked(trimmed);
      setQuestion("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : ASK_FAILED_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  return { question, setQuestion, answer, asked, isLoading, error, submit };
}
