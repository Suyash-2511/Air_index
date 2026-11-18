import { describe, expect, it } from "vitest";
import { INTERVENTIONS } from "@/lib/interventions/catalogue";
import { buildPlan } from "@/lib/interventions/rank";
import type { HouseholdMember } from "@/lib/types";
import { cyclist, flatDay, grandmother, household, member, smogDay } from "../fixtures/households";

function ids(plan: ReturnType<typeof buildPlan>): string[] {
  return plan.ranked.map((r) => r.id);
}

describe("buildPlan", () => {
  it("returns only changes that actually reduce dose", () => {
    const plan = buildPlan(household([cyclist, grandmother]), smogDay);
    expect(plan.ranked.length).toBeGreaterThan(0);
    for (const item of plan.ranked) expect(item.savedMicrograms).toBeGreaterThan(0);
  });

  it("sorts by priority score, highest first", () => {
    const scores = buildPlan(household([cyclist, grandmother]), smogDay).ranked.map((r) => r.priorityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("is stable: the same household always gets the same order", () => {
    const h = household([cyclist, grandmother]);
    expect(ids(buildPlan(h, smogDay))).toEqual(ids(buildPlan(h, smogDay)));
  });

  it("reports percentages consistent with micrograms saved", () => {
    const plan = buildPlan(household([cyclist]), smogDay);
    for (const item of plan.ranked) {
      expect(item.savedPercent).toBeCloseTo((item.savedMicrograms / plan.baselineTotal) * 100);
      expect(item.savedPercent).toBeLessThanOrEqual(100);
    }
  });

  it("suggests shifting a commute only when the air differs by hour", () => {
    expect(ids(buildPlan(household([cyclist]), smogDay))).toContain("shift_commute");
    expect(ids(buildPlan(household([cyclist]), flatDay(250)))).not.toContain("shift_commute");
  });

  it("skips changes the household has already made", () => {
    const plan = buildPlan(household([grandmother], { windowHabit: "kept_closed", hasPurifier: true, purifierRoom: "bedroom" }), smogDay);
    expect(ids(plan)).not.toContain("keep_windows_closed");
    expect(ids(plan)).not.toContain("move_purifier_to_bedroom");
    expect(ids(plan)).not.toContain("add_bedroom_purifier");
  });

  it("offers clean cooking only to homes on dirty fuels", () => {
    expect(ids(buildPlan(household([grandmother], { cookingFuel: "biomass" }), smogDay))).toContain("switch_to_clean_cooking");
    expect(ids(buildPlan(household([grandmother], { cookingFuel: "lpg" }), smogDay))).not.toContain("switch_to_clean_cooking");
  });

  it("ranks by computed saving, not by category: a big cooking saving beats a small mask saving", () => {
    const plan = buildPlan(household([grandmother], { cookingFuel: "biomass" }), flatDay(60));
    expect(ids(plan).indexOf("switch_to_clean_cooking")).toBeLessThan(ids(plan).indexOf("keep_windows_closed"));
  });

  it("ranks a change higher for a vulnerable household than for an identical healthy one", () => {
    const healthy: HouseholdMember = { ...grandmother, id: "g", ageBand: "adult", sensitivities: [] };
    const fragile: HouseholdMember = { ...grandmother, id: "g" };
    const score = (m: HouseholdMember) =>
      buildPlan(household([m]), smogDay).ranked.find((r) => r.id === "keep_windows_closed")?.priorityScore ?? 0;
    expect(score(fragile)).toBeGreaterThan(score(healthy));
  });

  it("credits each beneficiary only with their own saving", () => {
    const plan = buildPlan(household([cyclist, grandmother]), smogDay);
    const shift = plan.ranked.find((r) => r.id === "shift_commute");
    expect(shift?.beneficiaries.map((b) => b.memberId)).toEqual(["cyclist"]);
  });

  it("returns an empty plan when nothing can improve", () => {
    const sealed = member({
      windows: [{ activity: "sleep", setting: "indoor", startHour: 0, durationMinutes: 60, room: "bedroom", mask: false }],
    });
    const plan = buildPlan(household([sealed], { windowHabit: "kept_closed", hasPurifier: true, purifierRoom: "bedroom", cookingFuel: "electric" }), smogDay);
    expect(plan.ranked).toEqual([]);
  });

  it("reports a zero-dose baseline without dividing by zero", () => {
    const plan = buildPlan(household([cyclist]), flatDay(0));
    expect(plan.baselineTotal).toBe(0);
    expect(plan.ranked).toEqual([]);
  });

  it("accepts an injected catalogue so ranking can be tested in isolation", () => {
    const only = INTERVENTIONS.filter((i) => i.id === "mask_outdoors");
    expect(ids(buildPlan(household([cyclist]), smogDay, only))).toEqual(["mask_outdoors"]);
  });

  it("gives every catalogue entry a unique id", () => {
    const all = INTERVENTIONS.map((i) => i.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it("marks sustainable changes that cut the household's own emissions", () => {
    const cooking = INTERVENTIONS.find((i) => i.id === "switch_to_clean_cooking");
    expect(cooking?.reducesOwnEmissions).toBe(true);
  });
});
