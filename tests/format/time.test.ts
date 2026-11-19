import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, formatHourRange, formatTimeOfDay } from "@/lib/format/time";

describe("Time Formatting", () => {
  describe("formatClock", () => {
    it("formats midnight, midday and evening hours correctly", () => {
      expect(formatClock(0)).toBe("12 AM");
      expect(formatClock(6)).toBe("6 AM");
      expect(formatClock(12)).toBe("12 PM");
      expect(formatClock(18)).toBe("6 PM");
      expect(formatClock(23)).toBe("11 PM");
    });

    it("wraps hours outside 0-23 gracefully", () => {
      expect(formatClock(24)).toBe("12 AM");
      expect(formatClock(26)).toBe("2 AM");
      expect(formatClock(-1)).toBe("11 PM");
    });
  });

  describe("formatTimeOfDay", () => {
    it("formats round hours without minutes", () => {
      expect(formatTimeOfDay(360)).toBe("6 AM");
      expect(formatTimeOfDay(720)).toBe("12 PM");
    });

    it("formats hours with padded minutes", () => {
      expect(formatTimeOfDay(390)).toBe("6:30 AM");
      expect(formatTimeOfDay(365)).toBe("6:05 AM");
      expect(formatTimeOfDay(1110)).toBe("6:30 PM");
    });

    it("wraps minutes past 1440 correctly", () => {
      expect(formatTimeOfDay(1470)).toBe("12:30 AM");
      expect(formatTimeOfDay(-30)).toBe("11:30 PM");
    });
  });

  describe("formatHourRange", () => {
    it("combines identical AM/PM period suffixes", () => {
      expect(formatHourRange(2, 4)).toBe("2–4 AM");
      expect(formatHourRange(14, 16)).toBe("2–4 PM");
      expect(formatHourRange(18, 21)).toBe("6–9 PM");
    });

    it("separates different AM and PM periods", () => {
      expect(formatHourRange(11, 13)).toBe("11 AM – 1 PM");
      expect(formatHourRange(22, 26)).toBe("10 PM – 2 AM");
    });
  });

  describe("formatDuration", () => {
    it("formats durations under 60 minutes", () => {
      expect(formatDuration(15)).toBe("15 min");
      expect(formatDuration(45)).toBe("45 min");
    });

    it("formats exact hour increments", () => {
      expect(formatDuration(60)).toBe("1 hr");
      expect(formatDuration(120)).toBe("2 hr");
      expect(formatDuration(1440)).toBe("24 hr");
    });

    it("formats mixed hours and minutes", () => {
      expect(formatDuration(90)).toBe("1 hr 30 min");
      expect(formatDuration(75)).toBe("1 hr 15 min");
      expect(formatDuration(150)).toBe("2 hr 30 min");
    });
  });
});
