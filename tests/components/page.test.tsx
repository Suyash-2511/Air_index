// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import HomePage from "@/app/page";
import type { PlanApiResponse } from "@/client/types";

expect.extend(matchers);

describe("Complete Saans Application Flow with Landing Hero and 3 Steps", () => {
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

  it("completes Landing -> Step 1 -> Step 2 -> Step 3 with zero axe violations on all stages", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/plan")) {
        return { ok: true, json: async () => dummyPlanResponse } as Response;
      }
      if (url.includes("/api/air")) {
        return { ok: true, json: async () => ({ current: { hour: 9, pm25: 187.4 }, forecast: [] }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const { container } = render(<HomePage />);

    // LANDING HERO
    expect(screen.getByRole("heading", { level: 1, name: "Saans" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /What your family actually breathes today/i })).toBeDefined();
    // The live reading comes from the air endpoint, not a placeholder number
    expect(await screen.findByLabelText(/New Delhi: PM2.5 187 micrograms per cubic metre/i)).toBeDefined();

    const axeLanding = await axe(container);
    expect(axeLanding).toHaveNoViolations();

    // Click "Plan today for my home" to transition to Step 1
    await user.click(screen.getByRole("button", { name: "Plan today for my home" }));

    // STEP 1
    expect(screen.getByRole("heading", { level: 2, name: "Where are you?" })).toBeDefined();
    const axeStep1 = await axe(container);
    expect(axeStep1).toHaveNoViolations();

    // Click "Try a sample household (Delhi)" to transition to Step 2
    await user.click(screen.getByRole("button", { name: "Try a sample household (Delhi)" }));

    // STEP 2
    expect(screen.getByRole("heading", { level: 2, name: "Who lives here?" })).toBeDefined();
    const axeStep2 = await axe(container);
    expect(axeStep2).toHaveNoViolations();

    // Click "Build my plan" to transition to Step 3
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    // STEP 3
    expect(await screen.findByRole("heading", { level: 2, name: /Today your household will breathe/i })).toBeDefined();
    const axeStep3 = await axe(container);
    expect(axeStep3).toHaveNoViolations();
  }, 15000);

  it("allows direct jump to sample family from Landing Hero", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const sampleFamilyBtn = screen.getByRole("button", { name: "See a sample family" });
    await user.click(sampleFamilyBtn);

    expect(screen.getByRole("heading", { level: 2, name: "Who lives here?" })).toBeDefined();
    expect(screen.getByText("Mother")).toBeDefined();
  });

  it("toggles light/dark theme via header toggle button", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    // The app opens in light mode
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    const darkBtn = screen.getByRole("button", { name: /Dark Mode/i });
    await user.click(darkBtn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    const lightBtn = screen.getByRole("button", { name: /Light Mode/i });
    await user.click(lightBtn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
