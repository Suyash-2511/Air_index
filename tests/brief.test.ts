import { describe, expect, it } from "vitest";
import { type BriefInput, buildCommunityBrief, buildReadAloudScript, forecastExtremes, formatHour } from "@/lib/brief";

describe("brief", () => {
  const dummyDate = new Date(2026, 10, 18, 12, 0, 0);

  it("identifies worst and best hours accurately, formatting hours cleanly", () => {
    const forecast = [
      { hour: 0, pm25: 80 },
      { hour: 7, pm25: 240 },
      { hour: 14, pm25: 45 },
      { hour: 20, pm25: 180 },
    ];
    const extremes = forecastExtremes(forecast);
    expect(extremes).toBeDefined();
    expect(extremes?.worst).toEqual({ hour: 7, pm25: 240 });
    expect(extremes?.best).toEqual({ hour: 14, pm25: 45 });
    expect(formatHour(7)).toBe("7 AM");
    expect(formatHour(14)).toBe("2 PM");
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(12)).toBe("12 PM");
  });

  it("handles empty forecast gracefully without throwing", () => {
    expect(forecastExtremes([])).toBeUndefined();

    const brief = buildCommunityBrief({
      areaLabel: "Connaught Place",
      date: dummyDate,
      forecast: [],
      householdMicrograms: 120,
      changes: [],
    });
    expect(brief).toContain("Air today in Connaught Place");
    expect(brief).not.toContain("Worst around");

    const script = buildReadAloudScript({
      areaLabel: "Connaught Place",
      date: dummyDate,
      forecast: [],
      householdMicrograms: 120,
      changes: [],
    });
    expect(script).toContain("120 micrograms");
  });

  it("shows 'x times India\\'s daily limit' only when peak is >= 2x the 60 µg/m³ limit (>= 90 µg/m³ rounds to 2x)", () => {
    const lowInput: BriefInput = {
      areaLabel: "South Delhi",
      date: dummyDate,
      forecast: [{ hour: 8, pm25: 70 }, { hour: 15, pm25: 50 }],
      householdMicrograms: 150,
      changes: [],
    };
    const lowBrief = buildCommunityBrief(lowInput);
    expect(lowBrief).not.toContain("India's daily limit");

    const highInput: BriefInput = {
      areaLabel: "South Delhi",
      date: dummyDate,
      forecast: [{ hour: 8, pm25: 180 }, { hour: 15, pm25: 50 }],
      householdMicrograms: 150,
      changes: [],
    };
    const highBrief = buildCommunityBrief(highInput);
    expect(highBrief).toContain("about 3× India's daily limit.");
  });

  it("lists at most 3 changes and includes the own-emissions community benefit note", () => {
    const input: BriefInput = {
      areaLabel: "Noida Sector 62",
      date: dummyDate,
      forecast: [{ hour: 8, pm25: 200 }],
      householdMicrograms: 350,
      changes: [
        { title: "Run HEPA air purifier in bedroom", savedPercent: 32, reducesOwnEmissions: false },
        { title: "Switch to cleaner cooking fuel", savedPercent: 18, reducesOwnEmissions: true },
        { title: "Wear N95 mask during commute", savedPercent: 12, reducesOwnEmissions: false },
        { title: "Shift outdoor exercise to afternoon", savedPercent: 8, reducesOwnEmissions: false },
      ],
    };

    const brief = buildCommunityBrief(input);
    expect(brief).toContain("1. Run HEPA air purifier in bedroom");
    expect(brief).toContain("2. Switch to cleaner cooking fuel");
    expect(brief).toContain("3. Wear N95 mask during commute");
    expect(brief).not.toContain("4. Shift outdoor exercise");

    expect(brief).toContain("(also cuts smog we make)");
    expect(brief).toContain('If several homes do "switch to cleaner cooking fuel", the whole street breathes less.');
  });

  it("includes top 3 routine items in community brief and read-aloud script", () => {
    const input: BriefInput = {
      areaLabel: "Indirapuram",
      date: dummyDate,
      forecast: [{ hour: 14, pm25: 50 }],
      householdMicrograms: 200,
      changes: [],
      routine: [
        {
          startHour: 14,
          endHour: 16,
          kind: "ventilate",
          title: "Open windows for 15 minutes",
          detail: "Cleanest daytime air today at 50 µg/m³.",
          pm25: 50,
          memberIds: [],
          reducesOwnEmissions: false,
        },
      ],
    };

    const brief = buildCommunityBrief(input);
    expect(brief).toContain("Today's routine:");
    expect(brief).toContain("• 2 PM: Open windows for 15 minutes");

    const script = buildReadAloudScript(input);
    expect(script).toContain("At 2 PM, open windows for 15 minutes.");
  });

  it("supports Hindi locale, commute mode and community pledges in brief and script", () => {
    const input: BriefInput = {
      areaLabel: "दक्षिण दिल्ली",
      date: dummyDate,
      forecast: [{ hour: 8, pm25: 180 }, { hour: 15, pm25: 50 }],
      householdMicrograms: 250,
      changes: [{ title: "बेडरूम में प्यूरीफायर चलाएं", savedPercent: 30, reducesOwnEmissions: false }],
      commuteMode: "मेट्रो ट्रेन",
      pledges: ["कचरा या पत्ते न जलाएं"],
      locale: "hi",
    };

    const brief = buildCommunityBrief(input);
    expect(brief).toContain("दक्षिण दिल्ली में आज की हवा");
    expect(brief).toContain("चुनी गई यात्रा: मेट्रो ट्रेन");
    expect(brief).toContain("लिए गए स्वच्छ हवा संकल्प:");

    const script = buildReadAloudScript(input);
    expect(script).toContain("माइक्रोग्राम प्रदूषक कण सांस में लेगा");
  });
});
