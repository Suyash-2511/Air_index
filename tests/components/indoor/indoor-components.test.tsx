// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { IndoorHacks, PurifierCalculator } from "@/components/indoor";
import { IndoorAirSection } from "@/components/plan";

expect.extend(matchers);
afterEach(cleanup);

describe("Indoor Components", () => {
  describe("PurifierCalculator", () => {
    it("renders with zero axe violations", async () => {
      const { container } = render(<PurifierCalculator outdoorPm25={220} windowHabit="kept_closed" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("updates calculations when selecting preset and typing custom dimensions", async () => {
      const user = userEvent.setup();
      render(<PurifierCalculator outdoorPm25={220} windowHabit="kept_closed" />);

      const livingBtn = screen.getByRole("button", { name: /Living room/i });
      await user.click(livingBtn);

      expect(screen.getByText(/You need a purifier with at least/i)).toBeDefined();

      const lengthInput = screen.getByLabelText(/Length \(m\)/i);
      await user.clear(lengthInput);
      await user.type(lengthInput, "5");

      expect(screen.getByText(/You need a purifier with at least/i)).toBeDefined();
    });
  });

  describe("IndoorHacks", () => {
    it("renders cards with zero axe violations", async () => {
      const { container } = render(<IndoorHacks onSelectVentilate={vi.fn()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("filters cards and supports routine jump link", async () => {
      const user = userEvent.setup();
      const onVentilate = vi.fn();
      render(<IndoorHacks onSelectVentilate={onVentilate} />);

      const freeBtn = screen.getByRole("button", { name: "Free" });
      await user.click(freeBtn);

      expect(screen.queryByText(/DIY box-fan air cleaner/i)).toBeNull();
      expect(screen.getByText(/Wet mop floors instead of dry broom/i)).toBeDefined();

      const jumpBtn = screen.getByRole("button", { name: /Jump to today's ventilation hour/i });
      await user.click(jumpBtn);
      expect(onVentilate).toHaveBeenCalledTimes(1);
    });
  });

  describe("IndoorAirSection", () => {
    it("renders with zero axe violations", async () => {
      const { container } = render(<IndoorAirSection outdoorPm25={200} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
