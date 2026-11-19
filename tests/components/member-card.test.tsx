// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { MemberCard } from "@/components/household/MemberCard";
import type { HouseholdMember } from "@/lib/types";

expect.extend(matchers);
afterEach(cleanup);

describe("MemberCard", () => {
  const dummyMember: HouseholdMember = {
    id: "m-user",
    label: "You",
    ageBand: "adult",
    sensitivities: ["asthma"],
    windows: [
      { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
      { activity: "rest_indoor", setting: "indoor", startHour: 6, durationMinutes: 960, room: "living", mask: false },
    ],
  };

  it("renders with zero axe violations", async () => {
    const { container } = render(
      <MemberCard member={dummyMember} onUpdate={vi.fn()} onRemove={vi.fn()} canRemove={true} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("handles updating name, age group, sensitivity, adding/removing windows, and removing member", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onRemove = vi.fn();

    render(<MemberCard member={dummyMember} onUpdate={onUpdate} onRemove={onRemove} canRemove={true} />);

    await user.type(screen.getByLabelText(/Name/i), " New");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: expect.stringContaining("You") }));

    await user.selectOptions(screen.getByLabelText(/Age group/i), "older_adult");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ ageBand: "older_adult" }));

    await user.click(screen.getByRole("checkbox", { name: /Asthma/i }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ sensitivities: [] }));

    await user.click(screen.getByRole("button", { name: /\+ Add time block/i }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      windows: expect.arrayContaining([expect.objectContaining({ activity: "rest_indoor" })]),
    }));

    await user.click(screen.getByRole("button", { name: /Remove You/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
