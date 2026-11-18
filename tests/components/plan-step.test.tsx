// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import type { PlanApiResponse } from "@/client/types";
import { PlanStep } from "@/components/PlanStep";
import type { Household } from "@/lib/types";

expect.extend(matchers);

describe("PlanStep (Step 3)", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 120, room: "living", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 9, durationMinutes: 780, room: "living", mask: false },
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

  const dummyPlanData: PlanApiResponse = {
    baselineTotal: 300,
    baseline: [
      {
        memberId: "m-user",
        totalMicrograms: 300,
        byActivity: { commute_cycle: 180, light_indoor: 120 },
        byHour: Array.from({ length: 24 }, () => 12.5),
      },
    ],
    ranked: [
      {
        id: "keep_windows_closed",
        kind: "indoor_air",
        effort: "free",
        reducesOwnEmissions: false,
        savedMicrograms: 60,
        savedPercent: 20,
        priorityScore: 60,
        beneficiaries: [{ memberId: "m-user", savedMicrograms: 60, savedPercent: 20 }],
        explanation: {
          title: "Keep windows closed",
          whyItHelps: "Reduces outdoor particle infiltration during peak smog hours.",
          steps: ["Keep all exterior windows shut.", "Ensure doors stay closed."],
        },
      },
    ],
    air: {
      current: { hour: 12, pm25: 150 },
      forecast: Array.from({ length: 24 }, (_, i) => ({ hour: i, pm25: 150 })),
    },
    demoMode: true,
  };

  afterEach(() => {
    cleanup();
  });

  it("renders plan details and passes axe accessibility check with zero violations", async () => {
    const { container } = render(
      <PlanStep
        planData={dummyPlanData}
        household={dummyHousehold}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /Today your household will breathe/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Changes, ranked by what they save/i })).toBeDefined();
    expect(screen.getByRole("switch", { name: "Toggle Keep windows closed" })).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("toggling switch recomputes doses client-side without any network fetch", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(
      <PlanStep
        planData={dummyPlanData}
        household={dummyHousehold}
        onBack={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("switch", { name: "Toggle Keep windows closed" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    // Click switch to activate change
    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    // Must update headline with savings text
    expect(screen.getByText(/Cutting exposure by/i)).toBeDefined();

    // MUST NOT make any network calls during recomputation
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("displays permanent medical disclaimer", () => {
    render(
      <PlanStep
        planData={dummyPlanData}
        household={dummyHousehold}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/Saans provides exposure estimates for planning/i)).toBeDefined();
  });
});
