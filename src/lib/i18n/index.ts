import { EN_TRANSLATIONS, type TranslationKey } from "./en";
import { HI_TRANSLATIONS } from "./hi";
import type { Locale } from "./types";

export * from "./types";
export { EN_TRANSLATIONS, type TranslationKey } from "./en";
export { HI_TRANSLATIONS } from "./hi";

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  en: EN_TRANSLATIONS,
  hi: HI_TRANSLATIONS,
};

/**
 * Looks up and interpolates a localized message string with key-level compile safety.
 */
export function t(
  locale: Locale,
  key: TranslationKey | string,
  params?: Record<string, string | number | undefined>,
): string {
  const dict: Record<string, string> = DICTIONARIES[locale] || EN_TRANSLATIONS;
  const english: Record<string, string> = EN_TRANSLATIONS;
  let text = dict[key] || english[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
  }

  return text;
}
