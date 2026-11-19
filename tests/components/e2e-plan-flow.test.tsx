// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import type { PlanApiResponse } from "@/client/types";

describe("E2E Plan Flow", () => {
  const dummyPlanResponse: PlanApiResponse = {
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
          whyItHelps: "Reduces outdoor particle infiltration.",
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

  it("navigates Landing -> Sample family -> Build plan -> Toggle change -> Dose drops", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/plan")) {
        return { ok: true, json: async () => dummyPlanResponse } as Response;
      }
      if (url.includes("/api/air")) {
        return { ok: true, json: async () => ({ current: { hour: 8, pm25: 180 } }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(<HomePage />);

    const sampleBtn = screen.getByRole("button", { name: "See a sample family" });
    await user.click(sampleBtn);

    expect(await screen.findByRole("heading", { level: 2, name: "Who lives here?" })).toBeDefined();
    const buildBtn = screen.getByRole("button", { name: "Build my plan" });
    await user.click(buildBtn);

    expect(await screen.findByRole("heading", { level: 2, name: /Today your household will breathe/i })).toBeDefined();

    const toggle = screen.getByRole("switch", { name: "Toggle Keep windows closed" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    expect(screen.getByText(/Cutting exposure by/i)).toBeDefined();
  });
});
