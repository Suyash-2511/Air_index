// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { RoutineBlock, settingFor } from "@/components/RoutineBlock";
import type { ActivityWindow } from "@/lib/types";

expect.extend(matchers);
afterEach(cleanup);

const sleep: ActivityWindow = { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false };

function renderBlock(onChange = vi.fn()) {
  return render(
    <ol>
      <RoutineBlock index={0} window={sleep} canDelete onChange={onChange} onDelete={vi.fn()} />
    </ol>,
  );
}

describe("RoutineBlock", () => {
  it("maps walking and cycling to outdoors, not the vehicle cabin", () => {
    expect(settingFor("commute_walk")).toBe("outdoor");
    expect(settingFor("commute_cycle")).toBe("outdoor");
    expect(settingFor("commute_vehicle")).toBe("vehicle");
    expect(settingFor("cooking")).toBe("indoor");
  });

  it("shows the block's time range across midnight", () => {
    renderBlock();
    expect(screen.getByText(/10 PM – 6 AM/)).toBeDefined();
  });

  it("updates activity and its setting together", async () => {
    const onChange = vi.fn();
    renderBlock(onChange);
    await userEvent.selectOptions(screen.getByLabelText("Activity, block 1"), "commute_cycle");
    expect(onChange).toHaveBeenCalledWith({ activity: "commute_cycle", setting: "outdoor" });
  });

  it("has no accessibility violations", async () => {
    const { container } = renderBlock();
    expect(await axe(container)).toHaveNoViolations();
  });
});
