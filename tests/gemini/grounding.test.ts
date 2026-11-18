import { describe, expect, it } from "vitest";
import { filterGroundedSentences, groundText, normalizeMemberLabel } from "@/lib/gemini/grounding";
import type { Plan } from "@/lib/interventions/rank";

describe("Grounding & Number Verification", () => {
  const dummyPlan: Plan = {
    baselineTotal: 450.5,
    baseline: [
      {
        memberId: "m1",
        totalMicrograms: 450.5,
        byActivity: { commute_cycle: 150.2, sleep: 100 },
        byHour: [20, 20, 20],
      },
    ],
    ranked: [
      {
        id: "mask_outdoor",
        kind: "protection",
        effort: "low_cost",
        reducesOwnEmissions: false,
        savedMicrograms: 120.4,
        savedPercent: 26.7,
        priorityScore: 240.8,
        beneficiaries: [{ memberId: "m1", savedMicrograms: 120.4, savedPercent: 26.7 }],
      },
    ],
  };

  it("retains sentences where numbers match the plan exactly or rounded", () => {
    const text =
      "Closing windows reduces exposure by 120 µg. This represents a 27% reduction in daily PM2.5 dose.";
    const result = groundText(text, dummyPlan);
    expect(result).toContain("reduces exposure by 120 µg");
    expect(result).toContain("27% reduction");
  });

  it("preserves domain numbers such as PM2.5, PM10, and N95 masks", () => {
    const text =
      "Wear an N95 mask to filter out PM2.5 particulates during travel. Follow step 1 carefully.";
    const result = groundText(text, dummyPlan);
    expect(result).toBe(
      "Wear an N95 mask to filter out PM2.5 particulates during travel. Follow step 1 carefully.",
    );
  });

  it("strips sentences containing a deliberately invented or hallucinated number", () => {
    const text =
      "This action saves 120 µg of PM2.5. However, it also eliminates 999 kilograms of mystery smog. Follow step 2.";
    const result = groundText(text, dummyPlan);

    // The sentence with 999 is ungrounded and must be stripped
    expect(result).not.toContain("999");
    expect(result).not.toContain("mystery smog");
    expect(result).toContain("This action saves 120 µg of PM2.5.");
    expect(result).toContain("Follow step 2.");
  });

  it("filters out fabricated percentages not grounded in the plan", () => {
    const allowed = new Set<number>([100, 25, 2.5]);
    const input =
      "Cleaning filters improves efficiency by 25%. A miraculous 87% reduction was observed.";
    const filtered = filterGroundedSentences(input, allowed);

    expect(filtered).toContain("25%");
    expect(filtered).not.toContain("87%");
  });

  describe("Member Label Normalization", () => {
    it("maps self-referential words to 'You'", () => {
      expect(normalizeMemberLabel("self")).toBe("You");
      expect(normalizeMemberLabel("me")).toBe("You");
      expect(normalizeMemberLabel("I")).toBe("You");
      expect(normalizeMemberLabel("user")).toBe("You");
      expect(normalizeMemberLabel("SELF")).toBe("You");
    });

    it("capitalises other member labels", () => {
      expect(normalizeMemberLabel("mother")).toBe("Mother");
      expect(normalizeMemberLabel("father")).toBe("Father");
      expect(normalizeMemberLabel("child 1")).toBe("Child 1");
      expect(normalizeMemberLabel("older adult")).toBe("Older Adult");
    });
  });
});
