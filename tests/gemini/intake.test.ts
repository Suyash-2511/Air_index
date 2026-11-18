import { describe, expect, it } from "vitest";
import { isScheduleValid } from "@/lib/exposure/schedule";
import {
  buildConsistentAssumptions,
  getDemoIntakeFixture,
  intakeHousehold,
  intakeResultSchema,
} from "@/lib/gemini/intake";
import { householdSchema, type Location } from "@/lib/types";

describe("Household Intake", () => {
  const delhiLocation: Location = {
    lat: 28.6139,
    lng: 77.209,
    label: "New Delhi",
  };

  it("demo provider output passes both householdSchema and intakeResultSchema", () => {
    const fixture = getDemoIntakeFixture(delhiLocation);
    expect(intakeResultSchema.safeParse(fixture).success).toBe(true);
    expect(householdSchema.safeParse(fixture.household).success).toBe(true);
  });

  it("builds consistent assumptions in code and never lists purifierRoom when hasPurifier is false", () => {
    const text = "we cook on LPG and have open windows";
    const home = {
      windowHabit: "open_often" as const,
      hasPurifier: false,
      purifierRoom: "living" as const,
      cookingFuel: "lpg" as const,
      hasExhaustFan: false,
      smokingIndoors: false,
    };

    const assumed = buildConsistentAssumptions(text, home, []);
    expect(assumed.some((a) => a.toLowerCase().includes("purifier"))).toBe(true);
    // MUST NEVER mention purifierRoom when hasPurifier is false
    expect(assumed.some((a) => a.toLowerCase().includes("purifierroom"))).toBe(false);
    expect(assumed.some((a) => a.toLowerCase().includes("living room"))).toBe(false);
  });

  it("reports assumed fields and guarantees valid schedules for members", async () => {
    const raw = "my mother has asthma, I cycle to work at 8, we cook on LPG and keep windows open";
    const result = await intakeHousehold(raw, delhiLocation);

    expect(result.household.location).toEqual(delhiLocation);
    expect(result.household.members.length).toBeGreaterThanOrEqual(2);
    expect(result.assumed.length).toBeGreaterThan(0);

    for (const member of result.household.members) {
      expect(isScheduleValid(member.windows)).toBe(true);
      const totalMinutes = member.windows.reduce((sum, w) => sum + w.durationMinutes, 0);
      expect(totalMinutes).toBeLessThanOrEqual(1440);
    }

    const mother = result.household.members.find((m) => m.sensitivities.includes("asthma"));
    expect(mother).toBeDefined();
    expect(mother?.sensitivities).toContain("asthma");

    expect(result.household.home.cookingFuel).toBe("lpg");
    expect(result.household.home.windowHabit).toBe("open_often");
  });

  it("never invents conditions or members that were not mentioned", () => {
    const fixture = getDemoIntakeFixture(delhiLocation);
    const userMember = fixture.household.members.find((m) => m.label.toLowerCase().includes("user"));
    expect(userMember?.sensitivities).toEqual([]);
  });
});
