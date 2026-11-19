import { describe, expect, it } from "vitest";
import { getDefaultHousehold, getSampleHousehold } from "@/data/sampleHousehold";
import type { Location } from "@/lib/types";

describe("sampleHousehold", () => {
  const loc: Location = { lat: 28.6139, lng: 77.209, label: "New Delhi" };

  it("returns default single-member household", () => {
    const hh = getDefaultHousehold(loc);
    expect(hh.location).toEqual(loc);
    expect(hh.members.length).toBe(1);
    expect(hh.members[0]?.label).toBe("You");
    expect(hh.home.cookingFuel).toBe("lpg");
  });

  it("returns multi-member sample household for demo runs", () => {
    const hh = getSampleHousehold(loc);
    expect(hh.location).toEqual(loc);
    expect(hh.members.length).toBeGreaterThan(1);
    expect(hh.members[0]?.label).toBe("You");
  });
});
