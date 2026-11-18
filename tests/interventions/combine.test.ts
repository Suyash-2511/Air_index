import { describe, expect, it } from "vitest";
import { combineInterventions } from "@/lib/interventions/combine";
import { buildPlan } from "@/lib/interventions/rank";
import type { DayForecast, Household } from "@/lib/types";

describe("Intervention Combination Engine (Client-Side Instant Recompute)", () => {
  const sampleForecast: DayForecast = new Map(
    Array.from({ length: 24 }, (_, i) => [i, 150]),
  );

  const sampleHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 900, room: "living", mask: false },
        ],
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
    location: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
  };

  it("returns baseline doses when no intervention IDs are active", () => {
    const plan = buildPlan(sampleHousehold, sampleForecast);
    const combined = combineInterventions(sampleHousehold, sampleForecast, []);

    expect(combined).toHaveLength(1);
    expect(combined[0]?.totalMicrograms).toBeCloseTo(plan.baseline[0]?.totalMicrograms ?? 0, 4);
  });

  it("sequentially applies interventions and reduces dose", () => {
    const baselineDose = combineInterventions(sampleHousehold, sampleForecast, [])[0]?.totalMicrograms ?? 0;

    // Apply keep_windows_closed
    const afterWindows = combineInterventions(sampleHousehold, sampleForecast, ["keep_windows_closed"]);
    const windowsDose = afterWindows[0]?.totalMicrograms ?? 0;
    expect(windowsDose).toBeLessThan(baselineDose);

    // Apply both keep_windows_closed and mask_outdoors
    const afterBoth = combineInterventions(sampleHousehold, sampleForecast, [
      "keep_windows_closed",
      "mask_outdoors",
    ]);
    const bothDose = afterBoth[0]?.totalMicrograms ?? 0;
    expect(bothDose).toBeLessThan(windowsDose);
  });

  it("handles unknown or inapplicable intervention IDs gracefully", () => {
    const baseline = combineInterventions(sampleHousehold, sampleForecast, []);
    const withUnknown = combineInterventions(sampleHousehold, sampleForecast, ["non_existent_action_id"]);

    expect(withUnknown[0]?.totalMicrograms).toBeCloseTo(baseline[0]?.totalMicrograms ?? 0, 4);
  });
});
