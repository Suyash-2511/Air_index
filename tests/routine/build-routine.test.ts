import { describe, expect, it } from "vitest";
import { buildRoutine, type RankedLike } from "@/lib/routine/build-routine";
import type { Household } from "@/lib/types";

describe("buildRoutine", () => {
  const baseHousehold: Household = {
    members: [
      {
        id: "m-user",
        label: "You",
        ageBand: "adult",
        sensitivities: [],
        windows: [
          { activity: "sleep", setting: "indoor", startHour: 22, durationMinutes: 480, room: "bedroom", mask: false },
          { activity: "cooking", setting: "indoor", startHour: 7, durationMinutes: 60, room: "living", mask: false },
          { activity: "commute_cycle", setting: "outdoor", startHour: 8, durationMinutes: 60, room: "living", mask: false },
          { activity: "outdoor_exercise", setting: "outdoor", startHour: 17, durationMinutes: 60, room: "living", mask: false },
        ],
      },
    ],
    home: {
      windowHabit: "open_often",
      hasPurifier: false,
      purifierRoom: "living",
      cookingFuel: "biomass",
      hasExhaustFan: false,
      smokingIndoors: false,
    },
    location: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
  };

  const dummyForecast = Array.from({ length: 24 }, (_, h) => {
    // Dirtiest in morning (7-10 AM = 250), cleanest in afternoon (14-16 = 40), rest = 80
    if (h >= 7 && h <= 10) return { hour: h, pm25: 250 };
    if (h === 14 || h === 15) return { hour: h, pm25: 40 };
    return { hour: h, pm25: 80 };
  });

  it("handles empty and flat forecasts safely without throwing", () => {
    expect(buildRoutine(baseHousehold, [], [])).toEqual([]);

    const flatForecast = Array.from({ length: 24 }, (_, h) => ({ hour: h, pm25: 50 }));
    const routine = buildRoutine(baseHousehold, flatForecast, []);
    expect(routine.length).toBeGreaterThan(0);
    // Flat forecast below 90 µg/m³ should have no "seal" item
    expect(routine.some((r) => r.kind === "seal")).toBe(false);
  });

  it("picks cleanest daytime 2-hour window correctly and adds outdoor window for active members", () => {
    const routine = buildRoutine(baseHousehold, dummyForecast, []);
    const ventilate = routine.find((r) => r.kind === "ventilate");
    expect(ventilate).toBeDefined();
    expect(ventilate?.startHour).toBe(14);
    expect(ventilate?.endHour).toBe(16);
    expect(ventilate?.title).toBe("Open windows for 15 minutes");
    expect(ventilate?.detail).toContain("40 µg/m³");

    const outdoor = routine.find((r) => r.kind === "outdoor");
    expect(outdoor).toBeDefined();
    expect(outdoor?.title).toBe("Best time to be outside");
    expect(outdoor?.detail).toContain("Least smoggy daytime hours for You");
    expect(outdoor?.memberIds).toContain("m-user");
  });

  it("detects dirtiest contiguous stretch and adds 'x times limit' text only when >= 2x", () => {
    const routine = buildRoutine(baseHousehold, dummyForecast, []);
    const seal = routine.find((r) => r.kind === "seal");
    expect(seal).toBeDefined();
    expect(seal?.startHour).toBe(7);
    expect(seal?.endHour).toBe(11);
    expect(seal?.title).toBe("Keep windows shut");
    expect(seal?.detail).toContain("about 4× India's daily limit.");
  });

  it("attaches the highest-saving intervention for commute windows", () => {
    const ranked: RankedLike[] = [
      { id: "mask_outdoors", savedMicrograms: 40, reducesOwnEmissions: false },
      { id: "public_transport_instead_of_cycling", savedMicrograms: 95, reducesOwnEmissions: false },
      { id: "shift_commute", savedMicrograms: 60, reducesOwnEmissions: false },
    ];
    const routine = buildRoutine(baseHousehold, dummyForecast, ranked);
    const commute = routine.find((r) => r.kind === "commute");
    expect(commute).toBeDefined();
    expect(commute?.interventionId).toBe("public_transport_instead_of_cycling");
    expect(commute?.savedMicrograms).toBe(95);
  });

  it("sets reducesOwnEmissions true for cooking with cleaner_cooking_fuel", () => {
    const ranked: RankedLike[] = [
      { id: "cleaner_cooking_fuel", savedMicrograms: 80, reducesOwnEmissions: true },
    ];
    const routine = buildRoutine(baseHousehold, dummyForecast, ranked);
    const cook = routine.find((r) => r.kind === "cook");
    expect(cook).toBeDefined();
    expect(cook?.interventionId).toBe("cleaner_cooking_fuel");
    expect(cook?.reducesOwnEmissions).toBe(true);
  });

  it("sets sleep text appropriately with and without a purifier", () => {
    const withoutPurifier = buildRoutine(baseHousehold, dummyForecast, []);
    const sleepWithout = withoutPurifier.find((r) => r.kind === "sleep");
    expect(sleepWithout?.title).toBe("Windows closed before bed");

    const withHomePurifier: Household = {
      ...baseHousehold,
      home: { ...baseHousehold.home, hasPurifier: true },
    };
    const sleepWithHome = buildRoutine(withHomePurifier, dummyForecast, []);
    const sleepHome = sleepWithHome.find((r) => r.kind === "sleep");
    expect(sleepHome?.title).toBe("Windows closed, purifier on in the bedroom");

    const rankedPurifier: RankedLike[] = [
      { id: "air_purifier_bedroom", savedMicrograms: 120, reducesOwnEmissions: false },
    ];
    const sleepWithRanked = buildRoutine(baseHousehold, dummyForecast, rankedPurifier);
    const sleepRanked = sleepWithRanked.find((r) => r.kind === "sleep");
    expect(sleepRanked?.title).toBe("Windows closed, purifier on in the bedroom");
    expect(sleepRanked?.interventionId).toBe("air_purifier_bedroom");
  });

  it("ensures items are sorted by startHour and capped at 8 items maximum", () => {
    const routine = buildRoutine(baseHousehold, dummyForecast, []);
    expect(routine.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < routine.length; i += 1) {
      const prev = routine[i - 1]!;
      const curr = routine[i]!;
      expect(curr.startHour).toBeGreaterThanOrEqual(prev.startHour);
    }
  });

  it("never suggests public transport for a car commute", () => {
    const carHousehold: Household = {
      ...baseHousehold,
      members: [{ ...baseHousehold.members[0]!, windows: [
        { activity: "commute_vehicle", setting: "vehicle", startHour: 8, durationMinutes: 60, room: "living", mask: false },
      ] }],
    };
    const ranked: RankedLike[] = [{ id: "public_transport_instead_of_cycling", savedMicrograms: 300, reducesOwnEmissions: true }];
    const commute = buildRoutine(carHousehold, dummyForecast, ranked).find((i) => i.kind === "commute");
    expect(commute?.interventionId).toBeUndefined();
    expect(commute?.title).toBe("Keep car windows up, air on recirculate");
  });

  it("keeps overnight sleep past midnight instead of cutting it at 12 AM", () => {
    const sleep = buildRoutine(baseHousehold, dummyForecast, []).find((i) => i.kind === "sleep");
    expect(sleep?.startHour).toBe(22);
    expect(sleep?.endHour).toBe(30);
  });

  it("handles elevated ozone by keeping ventilate but preferring next-best window for outdoor activities", () => {
    const forecastWithOzone = dummyForecast.map((f) => {
      // Cleanest PM2.5 is hours 14-15 (40 µg/m³), but high afternoon ozone (180 µg/m³)
      if (f.hour === 14 || f.hour === 15) return { ...f, o3: 180 };
      // Next best PM2.5 is hours 16-17 (60 µg/m³), with safe ozone (55 µg/m³ avg)
      if (f.hour === 16) return { ...f, pm25: 60, o3: 70 };
      if (f.hour === 17) return { ...f, pm25: 60, o3: 40 };
      return { ...f, o3: 40 };
    });

    const routine = buildRoutine(baseHousehold, forecastWithOzone, []);
    const ventilate = routine.find((r) => r.kind === "ventilate");
    const outdoor = routine.find((r) => r.kind === "outdoor");

    // Ventilate stays at 14:00 (cleanest PM2.5 window)
    expect(ventilate?.startHour).toBe(14);

    // Outdoor moves to next-best window with safe ozone (16:00, PM2.5=60)
    expect(outdoor?.startHour).toBe(16);
    expect(outdoor?.detail).toContain("afternoon ozone is elevated");
  });
});

