import { describe, expect, it } from "vitest";
import { EN_TRANSLATIONS, HI_TRANSLATIONS, t, type TranslationKey } from "@/lib/i18n";

describe("i18n translation dictionaries", () => {
  it("has matching keys in Hindi for every English key", () => {
    const enKeys = Object.keys(EN_TRANSLATIONS) as TranslationKey[];
    const hiKeys = Object.keys(HI_TRANSLATIONS);

    expect(enKeys.length).toBeGreaterThan(20);
    for (const key of enKeys) {
      expect(HI_TRANSLATIONS[key], `Missing Hindi translation for key "${key}"`).toBeDefined();
      expect(HI_TRANSLATIONS[key].length).toBeGreaterThan(0);
    }
    expect(hiKeys.length).toBe(enKeys.length);
  });

  it("has matching parameter placeholders between English and Hindi", () => {
    const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;
    const enKeys = Object.keys(EN_TRANSLATIONS) as TranslationKey[];

    for (const key of enKeys) {
      const enParams = Array.from(EN_TRANSLATIONS[key].matchAll(paramRegex), (m) => m[1]).sort();
      const hiParams = Array.from(HI_TRANSLATIONS[key].matchAll(paramRegex), (m) => m[1]).sort();
      expect(hiParams, `Parameter mismatch for key "${key}"`).toEqual(enParams);
    }
  });

  it("interpolates parameters in translation strings", () => {
    const interpolated = t("en", "combobox_no_results", { query: "Nowhere" });
    expect(interpolated).toBe("No places in India match “Nowhere”. Try a city, neighbourhood or PIN code.");

    const hindiInterpolated = t("hi", "combobox_no_results", { query: "कनॉट प्लेस" });
    expect(hindiInterpolated).toBe("“कनॉट प्लेस” से मिलता-जुलता कोई स्थान नहीं मिला। शहर, इलाका या पिन कोड लिखें।");
  });

  it("falls back to key or English if unknown", () => {
    expect(t("hi", "nonexistent_key" as TranslationKey)).toBe("nonexistent_key");
  });
});
