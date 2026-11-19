// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import type { PlanApiResponse } from "@/client/types";
import { PlanStep } from "@/components/steps";
import { LocaleProvider, useLocale } from "@/hooks/useLocale";
import type { Household } from "@/lib/types";

expect.extend(matchers);

describe("Hindi localisation in PlanStep", () => {
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
    location: { lat: 28.6139, lng: 77.209, label: "नई दिल्ली" },
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
      forecast: Array.from({ length: 24 }, (_, i) => ({ hour: i, pm25: i >= 18 && i <= 22 ? 260 : 100 })),
    },
    demoMode: true,
  };

  afterEach(() => {
    cleanup();
  });

  function LanguageToggleTester() {
    const { toggleLocale } = useLocale();
    return (
      <button type="button" onClick={toggleLocale} data-testid="lang-toggle">
        Toggle
      </button>
    );
  }

  it("switches to हिन्दी, updates step headings, routine titles, button labels and has no axe violations", async () => {
    const { container } = render(
      <LocaleProvider initialLocale="hi">
        <PlanStep
          planData={dummyPlanData}
          household={dummyHousehold}
          onBack={vi.fn()}
        />
      </LocaleProvider>,
    );

    // Verify main headings are in Hindi
    expect(screen.getByRole("heading", { name: /आज आपका परिवार/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /उपाय, बचत के आधार पर क्रमित/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /घर के अंदर की हवा स्वच्छ बनाएं/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /सामुदायिक स्वच्छ हवा संकल्प/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /आज की दिनचर्या/i })).toBeDefined();

    // Verify button labels in Hindi
    expect(screen.getByRole("button", { name: "← परिवार की जानकारी बदलें" })).toBeDefined();
    expect(screen.getByRole("button", { name: "प्रिंट करें" })).toBeDefined();

    // Verify routine titles in Hindi
    expect(screen.getByText("खिड़कियाँ बंद रखें")).toBeDefined();

    // Verify no English text remains in main headings (h2, h3)
    const headings = container.querySelectorAll("h2, h3");
    const headingTexts = Array.from(headings).map((h) => h.textContent || "");

    const englishHeadings = [
      "Today your household will breathe",
      "Changes, ranked by what they save",
      "Low-emission commute comparison",
      "Make the air inside cleaner",
      "Community clean air pledge",
      "Your routine for today",
      "Your household, hour by hour",
      "Ask about your plan",
    ];

    for (const eng of englishHeadings) {
      for (const text of headingTexts) {
        expect(text).not.toContain(eng);
      }
    }

    // Verify no axe accessibility violations in Hindi
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("dynamically changes UI strings when switching locale via toggle", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="en">
        <LanguageToggleTester />
        <PlanStep
          planData={dummyPlanData}
          household={dummyHousehold}
          onBack={vi.fn()}
        />
      </LocaleProvider>,
    );

    // Starts in English
    expect(screen.getByRole("button", { name: "← Edit household" })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Your routine for today/i })).toBeDefined();

    // Toggle to Hindi
    await user.click(screen.getByTestId("lang-toggle"));

    expect(screen.getByRole("button", { name: "← परिवार की जानकारी बदलें" })).toBeDefined();
    expect(screen.getByRole("heading", { name: /आज की दिनचर्या/i })).toBeDefined();
  });
});
