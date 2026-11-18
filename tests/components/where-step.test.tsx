// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { DELHI_DEMO_LOCATION, WhereStep } from "@/components/WhereStep";

expect.extend(matchers);

describe("WhereStep (Step 1)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with proper headings and passes axe accessibility scan", async () => {
    const { container } = render(
      <WhereStep onLocationConfirmed={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "Where are you?" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Try a sample household (Delhi)" })).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("confirms Delhi sample household on button click", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(<WhereStep onLocationConfirmed={handleConfirm} />);

    const demoButton = screen.getByRole("button", { name: "Try a sample household (Delhi)" });
    await user.click(demoButton);

    expect(handleConfirm).toHaveBeenCalledWith(DELHI_DEMO_LOCATION, true);
  });

  it("disables Continue button until a location is confirmed", () => {
    render(<WhereStep onLocationConfirmed={vi.fn()} />);
    const continueBtn = screen.getByRole("button", { name: "Continue to Household" });
    expect(continueBtn.hasAttribute("disabled")).toBe(true);
  });
});
