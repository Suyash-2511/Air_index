// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { HomeSetupForm } from "@/components/household/HomeSetupForm";
import type { HomeSetup } from "@/lib/types";

expect.extend(matchers);
afterEach(cleanup);

describe("HomeSetupForm", () => {
  const defaultHome: HomeSetup = {
    windowHabit: "open_often",
    hasPurifier: false,
    purifierRoom: "living",
    cookingFuel: "lpg",
    hasExhaustFan: false,
    smokingIndoors: false,
  };

  it("renders with zero axe violations", async () => {
    const { container } = render(<HomeSetupForm home={defaultHome} onChange={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("handles changes to all form controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(<HomeSetupForm home={defaultHome} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/Windows/i), "kept_closed");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ windowHabit: "kept_closed" }));

    await user.selectOptions(screen.getByLabelText(/Main cooking fuel/i), "electric");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cookingFuel: "electric" }));

    await user.click(screen.getByRole("checkbox", { name: /We have an air purifier/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hasPurifier: true }));

    await user.click(screen.getByRole("checkbox", { name: /Kitchen chimney/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hasExhaustFan: true }));

    await user.click(screen.getByRole("checkbox", { name: /Someone smokes indoors/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ smokingIndoors: true }));

    rerender(<HomeSetupForm home={{ ...defaultHome, hasPurifier: true }} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText(/Purifier location room/i), "bedroom");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ purifierRoom: "bedroom" }));
  });
});
