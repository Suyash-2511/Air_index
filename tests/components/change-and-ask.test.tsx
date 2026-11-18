// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import type { RankedAction } from "@/client/types";
import { AskPanel } from "@/components/AskPanel";
import { ChangeCard } from "@/components/ChangeCard";
import type { Household } from "@/lib/types";

expect.extend(matchers);

describe("ChangeCard and AskPanel Components", () => {
  const dummyAction: RankedAction = {
    id: "cleaner_cooking_fuel",
    kind: "indoor_air",
    effort: "investment",
    reducesOwnEmissions: true,
    savedMicrograms: 50,
    savedPercent: 16.7,
    priorityScore: 50,
    beneficiaries: [{ memberId: "m1", savedMicrograms: 50, savedPercent: 16.7 }],
    explanation: {
      title: "Switch to cleaner cooking fuel",
      whyItHelps: "Eliminates indoor combustion emissions.",
      steps: ["Use induction or electric stove.", "Ventilate kitchen."],
      sustainableAlternative: "Electric appliances produce zero direct household emissions.",
    },
  };

  const dummyHousehold: Household = {
    members: [{ id: "m1", label: "Mother", ageBand: "older_adult", sensitivities: ["asthma"], windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }] }],
    home: { windowHabit: "open_often", hasPurifier: false, purifierRoom: "living", cookingFuel: "lpg", hasExhaustFan: false, smokingIndoors: false },
    location: { lat: 28.61, lng: 77.21, label: "Delhi" },
  };

  afterEach(() => {
    cleanup();
  });

  it("ChangeCard renders, expands details, toggles switch, and passes axe check", async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    const { container } = render(
      <ChangeCard action={dummyAction} isActive={false} onToggle={handleToggle} />,
    );

    const switchBtn = screen.getByRole("switch");
    expect(switchBtn.getAttribute("aria-checked")).toBe("false");
    await user.click(switchBtn);
    expect(handleToggle).toHaveBeenCalledWith("cleaner_cooking_fuel", true);

    // Expand details
    const expandBtn = screen.getByRole("button", { name: "How to do this ↓" });
    await user.click(expandBtn);
    expect(screen.getByText("Eliminates indoor combustion emissions.")).toBeDefined();
    expect(screen.getByText("Electric appliances produce zero direct household emissions.")).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("AskPanel submits questions and announces answers in aria-live container", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: "Yes, an N95 mask is effective for Mother during outdoor transit.",
        answerable: true,
        citations: ["Wear a mask outdoors"],
      }),
    } as Response);

    const { container } = render(<AskPanel household={dummyHousehold} />);

    const input = screen.getByPlaceholderText(/Should my mother wear a mask/i);
    await user.type(input, "Should my mother wear a mask?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText(/Yes, an N95 mask is effective/i)).toBeDefined();
    expect(screen.getByText("Wear a mask outdoors")).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
    vi.restoreAllMocks();
  });
});
