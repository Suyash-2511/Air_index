"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type Locale, type TranslationKey, t as translate } from "@/lib/i18n";

/** Value provided by LocaleContext. */
interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number | undefined>) => string;
}

const STORAGE_KEY = "saans_locale";

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key, params) => translate("en", key, params),
});

/**
 * Context provider managing application language state, localStorage persistence, and html lang tag.
 */
export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hi") {
        setLocaleState(saved);
        if (typeof document !== "undefined") {
          document.documentElement.lang = saved;
        }
      }
    } catch {
      // Storage can be blocked (private mode, disabled cookies); the language then just resets to English on reload.
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
    } catch {
      // Same restriction on write: the choice still applies for this visit, it is only not remembered.
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "hi" : "en");
  };

  const t = (key: string, params?: Record<string, string | number | undefined>) => {
    return translate(locale, key, params);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access and mutate active language and translate message keys.
 */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
