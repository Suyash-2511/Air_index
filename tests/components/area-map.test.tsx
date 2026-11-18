// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { AreaMap } from "@/components/AreaMap";

expect.extend(matchers);

describe("AreaMap", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a basemap img with alt text, N tile imgs, and passes axe accessibility check", async () => {
    const { container } = render(
      <AreaMap lat={28.6139} lng={77.209} label="Connaught Place, New Delhi" />,
    );

    const basemap = screen.getByRole("img", {
      name: /Street map of Connaught Place, New Delhi with PM2.5 heatmap overlay/i,
    });
    expect(basemap).toBeDefined();
    expect(basemap.getAttribute("src")).toContain("/api/staticmap?lat=28.61&lng=77.21");

    const tiles = container.querySelectorAll('img[src^="/api/tiles/12/"]');
    expect(tiles.length).toBeGreaterThan(0);

    expect(
      screen.getByText("Connaught Place, New Delhi · PM2.5 heatmap, Google Air Quality"),
    ).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("displays calm fallback panel after basemap error event occurs", () => {
    render(
      <AreaMap lat={28.6139} lng={77.209} label="Connaught Place, New Delhi" />,
    );

    const basemap = screen.getByRole("img", {
      name: /Street map of Connaught Place, New Delhi with PM2.5 heatmap overlay/i,
    });

    fireEvent.error(basemap);

    expect(
      screen.getByText("Map preview appears when a Google Maps key is set."),
    ).toBeDefined();
    expect(
      screen.queryByRole("img", {
        name: /Street map of Connaught Place, New Delhi with PM2.5 heatmap overlay/i,
      }),
    ).toBeNull();
  });
});
