// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { AirToday } from "@/components/AirToday";
import type { HourlyAir } from "@/lib/types";

expect.extend(matchers);

describe("AirToday Component", () => {
  afterEach(() => {
    cleanup();
  });

  const mockAir: HourlyAir = {
    hour: 11,
    pm25: 182,
    pm10: 290,
    no2: 75,
    o3: 49,
    co: 1.4,
    so2: 38,
    aqi: {
      value: 342,
      category: "Very poor",
      dominantPollutant: "pm25",
      source: "cpcb",
    },
  };

  it("renders big AQI value, category badge, dominant pollutant, and source", () => {
    render(<AirToday air={mockAir} />);

    expect(screen.getByText("342")).toBeDefined();
    expect(screen.getByText("Very poor")).toBeDefined();
    expect(screen.getByText(/PM2.5 \(Fine particulate matter\)/i)).toBeDefined();
    expect(screen.getByText("CPCB via Google Air Quality")).toBeDefined();
  });

  it("renders 6 criteria pollutant rows", () => {
    render(<AirToday air={mockAir} />);

    expect(screen.getByText("PM2.5")).toBeDefined();
    expect(screen.getByText("PM10")).toBeDefined();
    expect(screen.getByText("NO2")).toBeDefined();
    expect(screen.getByText("O3")).toBeDefined();
    expect(screen.getByText("CO")).toBeDefined();
    expect(screen.getByText("SO2")).toBeDefined();

    expect(screen.getByText("182 µg/m³")).toBeDefined();
    expect(screen.getByText("1.4 mg/m³")).toBeDefined();
  });

  it("expands and collapses pollutant health details on click", () => {
    render(<AirToday air={mockAir} />);

    const pm25Button = screen.getByRole("button", { name: /PM2\.5:/i });
    expect(pm25Button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Deep lung penetration/i)).toBeNull();

    fireEvent.click(pm25Button);
    expect(pm25Button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/Deep lung penetration/i)).toBeDefined();
    expect(screen.getByText(/National limit: 60 µg\/m³/i)).toBeDefined();

    fireEvent.click(pm25Button);
    expect(pm25Button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Deep lung penetration/i)).toBeNull();
  });

  it("passes axe accessibility check with zero violations", async () => {
    const { container } = render(<AirToday air={mockAir} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
