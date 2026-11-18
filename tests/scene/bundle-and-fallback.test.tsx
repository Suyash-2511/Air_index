// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers.js";
import { StaticFallback } from "../../src/components/scene/StaticFallback";

expect.extend(matchers);

describe("3D Scene Bundle Splitting & Static Fallback", () => {
  afterEach(() => {
    cleanup();
  });

  it("verifies page.tsx uses next/dynamic with ssr: false for 3D scene code isolation", () => {
    const pageSource = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf-8");
    expect(pageSource).toContain('import dynamic from "next/dynamic"');
    expect(pageSource).toContain("dynamic(");
    expect(pageSource).toContain('import("@/components/scene/AirScene")');
    expect(pageSource).toContain("ssr: false");
    // Verifies 3D libraries are not statically imported into initial page bundle
    expect(pageSource).not.toContain("import { AirScene } from");
    expect(pageSource).not.toContain('import * as THREE from "three"');
    expect(pageSource).not.toContain('import { Canvas } from "@react-three/fiber"');
  });

  it("renders StaticFallback with accessible role, descriptive aria-label, and zero axe violations", async () => {
    const { container } = render(<StaticFallback pm25={180} cityName="New Delhi" />);

    const fallbackImg = screen.getByRole("img", {
      name: /Visualisation of Earth with New Delhi air quality: PM2.5 180 micrograms per cubic metre/i,
    });
    expect(fallbackImg).toBeDefined();

    const axeResult = await axe(container);
    expect(axeResult).toHaveNoViolations();
  });
});
