// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { RoutineTimeline } from "@/components/RoutineTimeline";
import type { RoutineItem } from "@/lib/routine/build-routine";
import type { Household } from "@/lib/types";

expect.extend(matchers);

describe("RoutineTimeline", () => {
  const dummyHousehold: Household = {
    members: [
      { id: "m-user", label: "You", ageBand: "adult", sensitivities: [], windows: [] },
      { id: "m-child", label: "Aarav", ageBand: "child", sensitivities: [], windows: [] },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "lpg",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: { lat: 28.6139, lng: 77.209, label: "Connaught Place, New Delhi" },
  };

  const dummyItems: RoutineItem[] = [
    {
      startHour: 7,
      endHour: 9,
      kind: "seal",
      title: "Keep windows shut",
      detail: "Outdoor PM2.5 averages 240 µg/m³, about 4× India's daily limit.",
      pm25: 240,
      memberIds: ["m-user", "m-child"],
      interventionId: "keep_windows_closed",
      savedMicrograms: 65,
      reducesOwnEmissions: false,
    },
    {
      startHour: 14,
      endHour: 16,
      kind: "ventilate",
      title: "Open windows for 15 minutes",
      detail: "Cleanest daytime air today at 45 µg/m³.",
      pm25: 45,
      memberIds: ["m-user", "m-child"],
      reducesOwnEmissions: false,
    },
    {
      startHour: 18,
      endHour: 19,
      kind: "cook",
      title: "Ventilate cooking area",
      detail: "Cooking adds indoor PM2.5; ambient outdoor air is 110 µg/m³.",
      pm25: 110,
      memberIds: ["m-user"],
      interventionId: "switch_to_clean_cooking",
      savedMicrograms: 40,
      reducesOwnEmissions: true,
    },
  ];

  afterEach(() => {
    cleanup();
  });

  it("passes axe accessibility check with zero violations", async () => {
    const { container } = render(
      <RoutineTimeline
        items={dummyItems}
        areaLabel="Connaught Place, New Delhi"
        household={dummyHousehold}
        activeIds={[]}
        onToggleIntervention={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders items in order with times, titles, details, and calendar links with aria-labels", () => {
    render(
      <RoutineTimeline
        items={dummyItems}
        areaLabel="Connaught Place, New Delhi"
        household={dummyHousehold}
        activeIds={[]}
        onToggleIntervention={vi.fn()}
      />,
    );

    expect(screen.getByText("Your routine for today")).toBeDefined();
    expect(screen.getByText("Keep windows shut")).toBeDefined();
    expect(screen.getByText("Open windows for 15 minutes")).toBeDefined();
    expect(screen.getByText("Ventilate cooking area")).toBeDefined();

    // Calendar links have descriptive aria-labels
    const calLinks = screen.getAllByRole("link", { name: /Add .* to Google Calendar/i });
    expect(calLinks).toHaveLength(3);
    expect(calLinks[0]?.getAttribute("aria-label")).toBe("Add Keep windows shut to Google Calendar");
  });

  it("clicking the 'Add to plan' switch calls onToggleIntervention with the matching ID", async () => {
    const user = userEvent.setup();
    const toggleSpy = vi.fn();

    render(
      <RoutineTimeline
        items={dummyItems}
        areaLabel="Connaught Place, New Delhi"
        household={dummyHousehold}
        activeIds={["keep_windows_closed"]}
        onToggleIntervention={toggleSpy}
      />,
    );

    const switchBtn = screen.getByRole("switch", { name: "Add Keep windows shut to plan" });
    expect(switchBtn.getAttribute("aria-checked")).toBe("true");

    await user.click(switchBtn);
    expect(toggleSpy).toHaveBeenCalledWith("keep_windows_closed", false);
  });
});
