// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { InversionExplainer } from "@/components/plan";

expect.extend(matchers);

describe("InversionExplainer Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with zero axe violations", async () => {
    const { container } = render(<InversionExplainer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("displays the 3 physical stages of nocturnal atmospheric inversion", () => {
    render(<InversionExplainer />);
    expect(screen.getByRole("heading", { level: 3, name: /Why is the air worst at night and early morning\?/i })).toBeDefined();
    expect(screen.getByText(/1\. Cold night/i)).toBeDefined();
    expect(screen.getByText(/2\. Trapped layer/i)).toBeDefined();
    expect(screen.getByText(/3\. Sun lifts it/i)).toBeDefined();
    expect(screen.getByText(/Radiative heat loss/i)).toBeDefined();
    expect(screen.getByText(/Trapped surface smog/i)).toBeDefined();
    expect(screen.getByText(/Thermal mixing dilutes haze/i)).toBeDefined();
  });
});
