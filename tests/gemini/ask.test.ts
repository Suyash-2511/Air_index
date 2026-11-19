import { describe, expect, it } from "vitest";
import { askQuestion, getDemoAskFixture } from "@/lib/gemini/ask";
import type { Plan } from "@/lib/interventions/rank";
import type { Household } from "@/lib/types";

describe("Plan Ask Advisor", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "User",
        ageBand: "adult",
        sensitivities: [],
        windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }],
      },
      {
        id: "m-mother",
        label: "Mother",
        ageBand: "older_adult",
        sensitivities: ["asthma"],
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
    baselineTotal: 400,
    baseline: [{ memberId: "m-user", totalMicrograms: 200, byActivity: {}, byHour: [] }],
    ranked: [
      {
        id: "mask_outdoor",
        kind: "protection",
        effort: "low_cost",
        reducesOwnEmissions: false,
        savedMicrograms: 100,
        savedPercent: 25,
        priorityScore: 200,
        beneficiaries: [{ memberId: "m-user", savedMicrograms: 100, savedPercent: 25 }],
      },
    ],
  };

  it("answers plan-relevant questions with answerable=true and cited intervention", async () => {
    const res = await askQuestion("Should my mother use a mask?", dummyPlan, dummyHousehold);
    expect(res.answerable).toBe(true);
    expect(res.citedInterventionIds).toContain("mask_outdoor");
    expect(res.answer).toContain("Mother");
    expect(res.answer).not.toContain("m-mother");
    expect(res.answer).not.toContain("mask_outdoor");
  });

  it("returns answerable false and explains plainly for off-plan questions", async () => {
    const res = await askQuestion("What is the capital of France?", dummyPlan, dummyHousehold);
    expect(res.answerable).toBe(false);
    expect(res.citedInterventionIds).toHaveLength(0);
    expect(res.answer.toLowerCase()).toContain("cannot be answered");
  });

  it("demo fixture marks member plan query as answerable=true even when indoors", () => {
    const res = getDemoAskFixture("Should my mother use a mask?", dummyPlan, dummyHousehold);
    expect(res.answerable).toBe(true);
    expect(res.citedInterventionIds).toContain("mask_outdoor");
    expect(res.answer).toContain("Mother");
    expect(res.answer).not.toContain("m-mother");
  });

  it("demo fixture handles off-plan queries properly", () => {
    const res = getDemoAskFixture("Can you give me a recipe for chocolate cake?", dummyPlan, dummyHousehold);
    expect(res.answerable).toBe(false);
    expect(res.citedInterventionIds).toHaveLength(0);
    expect(res.answer).toContain("cannot be answered");
  });

  it("demo fixture supports Hindi locale", () => {
    const res = getDemoAskFixture("Should my mother use a mask?", dummyPlan, dummyHousehold, "hi");
    expect(res.answerable).toBe(true);
    expect(res.answer).toContain("माँ");
  });
});
