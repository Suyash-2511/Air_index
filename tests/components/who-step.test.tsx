// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { WhoStep } from "@/components/WhoStep";
import type { Household, Location } from "@/lib/types";

expect.extend(matchers);

describe("WhoStep (Step 2)", () => {
  const dummyLocation: Location = { lat: 28.6139, lng: 77.209, label: "New Delhi" };

  const validHousehold: Household = {
    members: [
      {
        id: "m1",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "light_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
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
    location: dummyLocation,
  };

  afterEach(() => {
    cleanup();
  });

  it("renders with member form and passes axe check", async () => {
    const { container } = render(
      <WhoStep
        location={dummyLocation}
        initialHousehold={validHousehold}
        onBuildPlan={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Who lives here?" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Build My Plan →" })).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("displays explicit assumptions when provided", () => {
    render(
      <WhoStep
        location={dummyLocation}
        initialHousehold={validHousehold}
        initialAssumed={["No air purifier in the home", "Cooking fuel assumed as LPG"]}
        onBuildPlan={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("What we assumed from your description:")).toBeDefined();
    expect(screen.getByText("No air purifier in the home")).toBeDefined();
    expect(screen.getByText("Cooking fuel assumed as LPG")).toBeDefined();
  });

  it("submits the household when Build My Plan is clicked", async () => {
    const user = userEvent.setup();
    const handleBuildPlan = vi.fn();

    render(
      <WhoStep
        location={dummyLocation}
        initialHousehold={validHousehold}
        onBuildPlan={handleBuildPlan}
        onBack={vi.fn()}
      />,
    );

    const buildBtn = screen.getByRole("button", { name: "Build My Plan →" });
    expect(buildBtn.hasAttribute("disabled")).toBe(false);

    await user.click(buildBtn);
    expect(handleBuildPlan).toHaveBeenCalledWith(validHousehold);
  });
});
