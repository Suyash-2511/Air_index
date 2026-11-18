import { describe, expect, it } from "vitest";
import { getDemoIntakeFixture, intakeHousehold, intakeResultSchema } from "@/lib/gemini/intake";
import { householdSchema } from "@/lib/types";

describe("Household Intake", () => {
  it("demo provider output passes both householdSchema and intakeResultSchema", () => {
    const fixture = getDemoIntakeFixture();
    expect(intakeResultSchema.safeParse(fixture).success).toBe(true);
    expect(householdSchema.safeParse(fixture.household).success).toBe(true);
  });

  it("reports assumed fields for default values applied", async () => {
    const raw = "my mother has asthma, I cycle to work at 8, we cook on LPG and keep windows open";
    const result = await intakeHousehold(raw);

    expect(result.household.members.length).toBeGreaterThanOrEqual(2);
    expect(result.assumed.length).toBeGreaterThan(0);
    expect(result.assumed.some((a) => a.toLowerCase().includes("delhi"))).toBe(true);

    const mother = result.household.members.find((m) => m.sensitivities.includes("asthma"));
    expect(mother).toBeDefined();
    expect(mother?.sensitivities).toContain("asthma");

    expect(result.household.home.cookingFuel).toBe("lpg");
    expect(result.household.home.windowHabit).toBe("open_often");
  });

  it("never invents conditions or members that were not mentioned", () => {
    const fixture = getDemoIntakeFixture();
    const userMember = fixture.household.members.find((m) => m.label.toLowerCase().includes("user"));
    expect(userMember?.sensitivities).toEqual([]);
  });
});
