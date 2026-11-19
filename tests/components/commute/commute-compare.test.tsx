// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { CommuteCompare } from "@/components/commute";

expect.extend(matchers);
afterEach(cleanup);

describe("CommuteCompare Component", () => {
  it("renders an accessible table with zero axe violations", async () => {
    const { container } = render(
      <CommuteCompare outdoorPm25={180} ageBand="adult" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("updates calculations when distance changes and triggers use this button", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onSelect = vi.fn();

    render(
      <CommuteCompare
        outdoorPm25={200}
        ageBand="adult"
        onApplyIntervention={onApply}
        onSelectMode={onSelect}
      />,
    );

    const input = screen.getByLabelText(/One-way trip distance:/i);
    await user.clear(input);
    await user.type(input, "12");

    const useMetroBtn = screen.getByRole("button", { name: /Use Metro train for commute/i });
    await user.click(useMetroBtn);

    expect(onApply).toHaveBeenCalledWith("public_transport_instead_of_cycling");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ mode: "metro" }));
  });
});
