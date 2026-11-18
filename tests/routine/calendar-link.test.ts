import { describe, expect, it } from "vitest";
import type { RoutineItem } from "@/lib/routine/build-routine";
import { buildGoogleCalendarUrl } from "@/lib/routine/calendar-link";

describe("buildGoogleCalendarUrl", () => {
  const dummyItem: RoutineItem = {
    startHour: 14,
    endHour: 16,
    kind: "ventilate",
    title: "Open windows for 15 minutes",
    detail: "Cleanest daytime air today at 40 µg/m³.",
    pm25: 40,
    memberIds: ["m-user"],
    reducesOwnEmissions: false,
  };

  const fixedDate = new Date(2026, 10, 18, 10, 0, 0); // 18 Nov 2026

  it("builds a valid Google Calendar URL with correct dates format and encoded text", () => {
    const url = buildGoogleCalendarUrl(dummyItem, fixedDate);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Open windows for 15 minutes");
    expect(parsed.searchParams.get("details")).toBe("Cleanest daytime air today at 40 µg/m³.");
    expect(parsed.searchParams.get("dates")).toBe("20261118T140000/20261118T160000");
  });

  it("handles day transition when end hour wraps past midnight", () => {
    const sleepItem: RoutineItem = {
      startHour: 23,
      endHour: 25,
      kind: "sleep",
      title: "Windows closed before bed",
      detail: "Overnight outdoor PM2.5 around 80 µg/m³.",
      pm25: 80,
      memberIds: ["m-user"],
      reducesOwnEmissions: false,
    };

    const url = buildGoogleCalendarUrl(sleepItem, fixedDate);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("dates")).toBe("20261118T230000/20261119T010000");
  });
});
