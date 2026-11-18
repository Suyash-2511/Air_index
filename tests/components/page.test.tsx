// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import HomePage from "@/app/page";
import type { PlanApiResponse } from "@/client/types";

expect.extend(matchers);

describe("Complete 3-Step Saans Application Flow", () => {
  const dummyPlanResponse: PlanApiResponse = {
    baselineTotal: 350,
    baseline: [
      {
        memberId: "m-user",
        totalMicrograms: 350,
        byActivity: { commute_cycle: 200, light_indoor: 150 },
        byHour: Array.from({ length: 24 }, () => 14.5),
      },
    ],
    ranked: [
      {
        id: "keep_windows_closed",
        kind: "indoor_air",
        effort: "free",
        reducesOwnEmissions: false,
        savedMicrograms: 70,
        savedPercent: 20,
        priorityScore: 70,
        beneficiaries: [{ memberId: "m-user", savedMicrograms: 70, savedPercent: 20 }],
        explanation: {
          title: "Keep windows closed",
          whyItHelps: "Cuts outdoor PM2.5 infiltration.",
          steps: ["Close all balcony doors.", "Keep windows sealed."],
        },
      },
    ],
    air: {
      current: { hour: 8, pm25: 180 },
      forecast: Array.from({ length: 24 }, (_, i) => ({ hour: i, pm25: 180 })),
    },
    demoMode: true,
  };

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("completes Step 1 -> Step 2 -> Step 3 with zero axe violations on all 3 steps", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/plan")) {
        return { ok: true, json: async () => dummyPlanResponse } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const { container } = render(<HomePage />);

    // STEP 1
    expect(screen.getByRole("heading", { level: 1, name: "Saans" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Where are you?" })).toBeDefined();

    const axeStep1 = await axe(container);
    expect(axeStep1).toHaveNoViolations();

    // Click "Try a sample household (Delhi)" to transition to Step 2
    await user.click(screen.getByRole("button", { name: "Try a sample household (Delhi)" }));

    // STEP 2
    expect(screen.getByRole("heading", { level: 2, name: "Who lives here?" })).toBeDefined();
    const axeStep2 = await axe(container);
    expect(axeStep2).toHaveNoViolations();

    // Click "Build My Plan →" to transition to Step 3
    await user.click(screen.getByRole("button", { name: "Build My Plan →" }));

    // STEP 3
    expect(await screen.findByRole("heading", { level: 2, name: /Today your household will breathe/i })).toBeDefined();
    const axeStep3 = await axe(container);
    expect(axeStep3).toHaveNoViolations();
  });

  it("toggles light/dark theme via header toggle button", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const themeBtn = screen.getByRole("button", { name: /Dark Mode/i });
    await user.click(themeBtn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    const lightBtn = screen.getByRole("button", { name: /Light Mode/i });
    await user.click(lightBtn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
