import { describe, expect, it } from "vitest";
import { explainPlan, getDemoExplainFixture } from "@/lib/gemini/explain";
import type { Plan } from "@/lib/interventions/rank";
import type { Household } from "@/lib/types";

describe("Plan Explainer", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "m1",
        label: "User",
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
    baseline: [{ memberId: "m1", totalMicrograms: 300, byActivity: { rest_indoor: 300 }, byHour: [12] }],
    ranked: [
      {
        id: "close_windows_smog",
        kind: "indoor_air",
        effort: "free",
        reducesOwnEmissions: false,
        savedMicrograms: 75,
        savedPercent: 25,
        priorityScore: 75,
        beneficiaries: [{ memberId: "m1", savedMicrograms: 75, savedPercent: 25 }],
      },
    ],
  };

  it("demo explain fixture strictly uses computed plan numbers", () => {
    const fixture = getDemoExplainFixture(dummyPlan);
    expect(fixture.explanations).toHaveLength(1);

    const first = fixture.explanations[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("Expected first explanation");
    expect(first.id).toBe("close_windows_smog");
    expect(first.whyItHelps).toContain("75 µg");
    expect(first.whyItHelps).toContain("25%");
    expect(first.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("explainPlan generates grounded explanations for all ranked interventions", async () => {
    const explanations = await explainPlan(dummyPlan, dummyHousehold);
    expect(explanations.close_windows_smog).toBeDefined();

    const exp = explanations.close_windows_smog;
    expect(exp).toBeDefined();
    if (!exp) throw new Error("Expected explanation for close_windows_smog");
    expect(exp.title).toBeDefined();
    expect(exp.whyItHelps).toContain("75");
    expect(exp.steps.length).toBeGreaterThanOrEqual(2);
  });
});
