"use client";

import { useEffect, useState } from "react";

/** Reads text aloud with the browser's speech engine, when it has one. */
export function useReadAloud(buildText: () => string, language: string) {
  const [canSpeak, setCanSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Feature detection runs after mount so server and first client render agree.
    setCanSpeak("speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggle = () => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(buildText());
    utterance.lang = language;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return { canSpeak, isSpeaking, toggle };
}
