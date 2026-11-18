// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { Combobox } from "@/components/Combobox";

expect.extend(matchers);

describe("Combobox Component", () => {
  afterEach(() => {
    cleanup();
  });
  const suggestions = [
    { placeId: "p1", mainText: "Connaught Place", secondaryText: "New Delhi, Delhi" },
    { placeId: "p2", mainText: "Hauz Khas", secondaryText: "New Delhi, Delhi" },
  ];

  it("renders with proper accessibility attributes and passes axe check", async () => {
    const { container } = render(
      <Combobox
        label="Search city"
        value=""
        onChange={vi.fn()}
        onSelect={vi.fn()}
        suggestions={[]}
        placeholder="Type a location"
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input).toBeDefined();
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("navigates suggestions via keyboard and selects on Enter", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleChange = vi.fn();

    render(
      <Combobox
        label="Search city"
        value="Delhi"
        onChange={handleChange}
        onSelect={handleSelect}
        suggestions={suggestions}
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("true");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);

    // Press ArrowDown to highlight first option
    await user.type(input, "{arrowdown}");
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    // Press Enter to select
    await user.type(input, "{enter}");
    expect(handleSelect).toHaveBeenCalledWith(suggestions[0]);
  });

  it("displays error with aria-describedby linkage", async () => {
    const { container } = render(
      <Combobox
        label="Search city"
        value=""
        onChange={vi.fn()}
        onSelect={vi.fn()}
        suggestions={[]}
        error="Location not found"
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg.textContent).toBe("Location not found");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("says when a finished search found no places", () => {
    render(
      <Combobox label="Search city" value="zzqx" onChange={vi.fn()} onSelect={vi.fn()} suggestions={[]} noResultsFor="zzqx" />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/No places in India match “zzqx”/);
  });
});

