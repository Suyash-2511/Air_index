import { describe, expect, it } from "vitest";
import { explainPlan, getDemoExplainFixture } from "@/lib/gemini/explain";
import { stripInternalIds } from "@/lib/gemini/grounding";
import type { Plan } from "@/lib/interventions/rank";
import type { Household } from "@/lib/types";

describe("Plan Explainer", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "member-1",
        label: "Mother",
        ageBand: "older_adult",
        sensitivities: ["asthma"],
        windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }],
      },
      {
        id: "member-2",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: { lat: 28.61, lng: 77.21, label: "Delhi" },
  };

  const dummyPlan: Plan = {
    baselineTotal: 300,
    baseline: [{ memberId: "member-1", totalMicrograms: 300, byActivity: { rest_indoor: 300 }, byHour: [12] }],
    ranked: [
      {
        id: "keep_windows_closed",
        kind: "indoor_air",
        effort: "free",
        reducesOwnEmissions: false,
        savedMicrograms: 75,
        savedPercent: 25,
        priorityScore: 75,
        beneficiaries: [{ memberId: "member-1", savedMicrograms: 75, savedPercent: 25 }],
      },
    ],
  };

  it("demo explain fixture strictly uses computed plan numbers and member labels", () => {
    const fixture = getDemoExplainFixture(dummyPlan, dummyHousehold);
    expect(fixture.explanations).toHaveLength(1);

    const first = fixture.explanations[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("Expected explanation");
    expect(first.title).toBe("Keep windows closed");
    expect(first.whyItHelps).toContain("75 µg");
    expect(first.whyItHelps).toContain("25%");
    expect(first.whyItHelps).toContain("Mother");
    expect(first.whyItHelps).not.toContain("member-1");
  });

  it("explainPlan generates grounded explanations with zero internal IDs", async () => {
    const explanations = await explainPlan(dummyPlan, dummyHousehold);
    expect(explanations.keep_windows_closed).toBeDefined();

    const exp = explanations.keep_windows_closed;
    expect(exp).toBeDefined();
    if (!exp) throw new Error("Expected explanation");
    expect(exp.title).toBe("Keep windows closed");
    expect(exp.whyItHelps).toContain("75");
    expect(exp.whyItHelps).not.toContain("member-1");
    expect(exp.whyItHelps).not.toContain("keep_windows_closed");
  });

  it("stripInternalIds strips raw member IDs and snake_case intervention IDs from text", () => {
    const memberMap = new Map([
      ["member-1", "Mother"],
      ["member-2", "You"],
    ]);
    const idMap = new Map([["keep_windows_closed", "Keep windows closed"]]);

    const rawModelOutput =
      "Action keep_windows_closed protects member-1 and member-2 from outdoor smog.";
    const cleaned = stripInternalIds(rawModelOutput, memberMap, idMap);

    expect(cleaned).not.toContain("member-1");
    expect(cleaned).not.toContain("member-2");
    expect(cleaned).not.toContain("keep_windows_closed");
    expect(cleaned).toBe("Action Keep windows closed protects Mother and You from outdoor smog.");
  });

  it("omits sustainableAlternative note when reducesOwnEmissions is false", async () => {
    // dummyPlan has keep_windows_closed with reducesOwnEmissions: false
    const explanations = await explainPlan(dummyPlan, dummyHousehold);
    expect(explanations.keep_windows_closed?.sustainableAlternative).toBeUndefined();
  });

  it("includes sustainableAlternative note when reducesOwnEmissions is true", async () => {
    const planWithEmissions: Plan = {
      baselineTotal: 300,
      baseline: dummyPlan.baseline,
      ranked: [
        {
          id: "cleaner_cooking_fuel",
          kind: "indoor_air",
          effort: "investment",
          reducesOwnEmissions: true,
          savedMicrograms: 50,
          savedPercent: 16.7,
          priorityScore: 50,
          beneficiaries: [{ memberId: "member-1", savedMicrograms: 50, savedPercent: 16.7 }],
        },
      ],
    };
    const explanations = await explainPlan(planWithEmissions, dummyHousehold);
    expect(explanations.cleaner_cooking_fuel?.sustainableAlternative).toBeDefined();
    expect(typeof explanations.cleaner_cooking_fuel?.sustainableAlternative).toBe("string");
  });

  it("supports Hindi locale in demo explain fixture", () => {
    const fixture = getDemoExplainFixture(dummyPlan, dummyHousehold, "hi");
    expect(fixture.explanations[0]?.whyItHelps).toContain("सुरक्षा");
  });
});
