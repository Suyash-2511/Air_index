// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { DayStrip } from "@/components/DayStrip";
import type { DoseBreakdown, Household } from "@/lib/types";

expect.extend(matchers);

describe("DayStrip Component", () => {
  const dummyHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [{ activity: "rest_indoor", setting: "indoor", startHour: 0, durationMinutes: 1440, room: "living", mask: false }],
      },
    ],
    home: { windowHabit: "open_often", hasPurifier: false, purifierRoom: "living", cookingFuel: "lpg", hasExhaustFan: false, smokingIndoors: false },
    location: { lat: 28.61, lng: 77.21, label: "Delhi" },
  };

  const dummyDoses: DoseBreakdown[] = [
    {
      memberId: "m-user",
      totalMicrograms: 240,
      byActivity: { rest_indoor: 240 },
      byHour: Array.from({ length: 24 }, (_, i) => (i === 8 ? 30 : 9)),
    },
  ];

  afterEach(() => {
    cleanup();
  });

  it("renders 24-hour strip, peak notice, hidden table, and passes axe check", async () => {
    const { container } = render(
      <DayStrip
        household={dummyHousehold}
        baselineDoses={dummyDoses}
        currentDoses={dummyDoses}
        hasChangesActive={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your Household's 24-Hour Day" })).toBeDefined();
    expect(screen.getByText(/Peak intake at 8 AM \(30.0 µg\)/i)).toBeDefined();

    // Verify hidden screen-reader table
    const table = screen.getByRole("table", { hidden: true });
    expect(table).toBeDefined();
    expect(screen.getByText("Hourly inhaled PM2.5 dose breakdown for You")).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
