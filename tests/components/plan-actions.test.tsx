// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import type { PlanApiResponse } from "@/client/types";
import { PlanActions } from "@/components/plan";
import type { Household } from "@/lib/types";

expect.extend(matchers);

describe("PlanActions", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [],
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
    location: { lat: 28.6139, lng: 77.209, label: "Lajpat Nagar, New Delhi" },
  };

  const dummyPlanData: PlanApiResponse = {
    baselineTotal: 250,
    baseline: [],
    ranked: [
      {
        id: "hepa_purifier_bedroom",
        kind: "indoor_air",
        effort: "low_cost",
        reducesOwnEmissions: false,
        savedMicrograms: 50,
        savedPercent: 20,
        priorityScore: 50,
        beneficiaries: [],
        explanation: {
          title: "Run HEPA air purifier in bedroom",
          whyItHelps: "Reduces nocturnal indoor particle dose.",
          steps: [],
        },
      },
    ],
    air: {
      current: { hour: 8, pm25: 180 },
      forecast: [{ hour: 8, pm25: 180 }, { hour: 15, pm25: 60 }],
    },
    demoMode: true,
  };

  beforeEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
      },
    });

    class MockUtterance {
      text: string;
      lang = "";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: MockUtterance,
    });

    Object.defineProperty(window, "print", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("passes axe accessibility check with zero violations", async () => {
    const { container } = render(
      <PlanActions
        planData={dummyPlanData}
        household={dummyHousehold}
        currentTotal={200}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("copy calls clipboard with text containing the area label and announces 'Brief copied'", async () => {
    const user = userEvent.setup();
    const writeSpy = vi.spyOn(navigator.clipboard, "writeText");

    render(
      <PlanActions
        planData={dummyPlanData}
        household={dummyHousehold}
        currentTotal={200}
      />,
    );

    const copyBtn = screen.getByRole("button", { name: /Copy community brief/i });
    await user.click(copyBtn);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const copiedText = writeSpy.mock.calls[0]?.[0];
    expect(copiedText).toContain("Lajpat Nagar, New Delhi");
    expect(screen.getByText("Brief copied")).toBeDefined();
  });

  it("read aloud calls speechSynthesis.speak and cancels on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <PlanActions
        planData={dummyPlanData}
        household={dummyHousehold}
        currentTotal={200}
      />,
    );

    const speakBtn = screen.getByRole("button", { name: /Read aloud/i });
    await user.click(speakBtn);

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);

    unmount();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it("print button calls window.print", async () => {
    const user = userEvent.setup();
    render(
      <PlanActions
        planData={dummyPlanData}
        household={dummyHousehold}
        currentTotal={200}
      />,
    );

    const printBtn = screen.getByRole("button", { name: /Print plan/i });
    await user.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
