import { describe, expect, it } from "vitest";
import { filterHacksByCost, INDOOR_HACKS } from "@/lib/indoor/hacks";

describe("INDOOR_HACKS", () => {
  it("contains exactly 8 evidence-based cards with valid structure", () => {
    expect(INDOOR_HACKS.length).toBe(8);
    for (const hack of INDOOR_HACKS) {
      expect(hack.title.length).toBeGreaterThan(5);
      expect(hack.effectPhrase.length).toBeGreaterThan(10);
      expect(hack.steps.length).toBeGreaterThanOrEqual(2);
      expect(["Free", "Under ₹500", "Under ₹3,000"]).toContain(hack.costTag);
    }
  });

  it("includes the plant myth clarification card", () => {
    const myth = INDOOR_HACKS.find((h) => h.isMyth);
    expect(myth).toBeDefined();
    expect(myth?.title).toContain("Houseplants");
  });

  it("filters cards by cost category", () => {
    const freeHacks = filterHacksByCost(INDOOR_HACKS, "Free");
    expect(freeHacks.length).toBeGreaterThan(0);
    expect(freeHacks.every((h) => h.costTag === "Free")).toBe(true);

    const under500 = filterHacksByCost(INDOOR_HACKS, "Under ₹500");
    expect(under500.every((h) => h.costTag === "Under ₹500")).toBe(true);

    const all = filterHacksByCost(INDOOR_HACKS, "All");
    expect(all.length).toBe(8);
  });
});
