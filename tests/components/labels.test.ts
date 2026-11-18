import { describe, expect, it } from "vitest";
import { ACTIVITIES, AGE_BANDS, SENSITIVITIES } from "@/lib/types";
import { ACTIVITY_LABELS, AGE_BAND_LABELS, SENSITIVITY_LABELS, formatClock, formatDuration, toSentenceCase } from "@/components/labels";

describe("plain-language labels", () => {
  it("names every activity, age group and condition", () => {
    for (const a of ACTIVITIES) expect(ACTIVITY_LABELS[a]).toMatch(/^[A-Z]/);
    for (const b of AGE_BANDS) expect(AGE_BAND_LABELS[b]).toMatch(/^[A-Z]/);
    for (const s of SENSITIVITIES) expect(SENSITIVITY_LABELS[s]).toMatch(/^[A-Z]/);
  });

  it("formats durations the way people say them", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(1440)).toBe("24 hr");
  });

  it("formats hours on a 12-hour clock", () => {
    expect(formatClock(0)).toBe("12 AM");
    expect(formatClock(6)).toBe("6 AM");
    expect(formatClock(12)).toBe("12 PM");
    expect(formatClock(23)).toBe("11 PM");
  });

  it("sentence-cases titles but keeps acronyms", () => {
    expect(toSentenceCase("Add Bedroom Purifier")).toBe("Add bedroom purifier");
    expect(toSentenceCase("Wear An N95 Mask")).toBe("Wear an N95 mask");
    expect(toSentenceCase("Run HEPA Purifier")).toBe("Run HEPA purifier");
  });
});

