import { describe, expect, it } from "vitest";
import { calculateIndiaAqi, calculateSubIndex, getAqiCategory } from "@/lib/air/india-aqi";

describe("india-aqi", () => {
  it("computes PM2.5 sub-index correctly at band edges", () => {
    // 0 -> 0
    expect(calculateSubIndex("pm25", 0)).toBe(0);
    // 30 -> 50 (Good)
    expect(calculateSubIndex("pm25", 30)).toBe(50);
    // 60 -> 100 (Satisfactory)
    expect(calculateSubIndex("pm25", 60)).toBe(100);
    // 90 -> 200 (Moderate)
    expect(calculateSubIndex("pm25", 90)).toBe(200);
    // 120 -> 300 (Poor)
    expect(calculateSubIndex("pm25", 120)).toBe(300);
    // 250 -> 400 (Very poor)
    expect(calculateSubIndex("pm25", 250)).toBe(400);
    // 380+ -> 500 (Severe)
    expect(calculateSubIndex("pm25", 380)).toBe(500);
    expect(calculateSubIndex("pm25", 500)).toBe(500);
  });

  it("computes sub-indices for PM10, NO2, O3, CO, SO2 at band transitions", () => {
    // PM10 50 -> 50, 100 -> 100, 250 -> 200
    expect(calculateSubIndex("pm10", 50)).toBe(50);
    expect(calculateSubIndex("pm10", 100)).toBe(100);
    expect(calculateSubIndex("pm10", 250)).toBe(200);

    // NO2 40 -> 50, 80 -> 100, 180 -> 200
    expect(calculateSubIndex("no2", 40)).toBe(50);
    expect(calculateSubIndex("no2", 80)).toBe(100);
    expect(calculateSubIndex("no2", 180)).toBe(200);

    // O3 50 -> 50, 100 -> 100, 168 -> 200
    expect(calculateSubIndex("o3", 50)).toBe(50);
    expect(calculateSubIndex("o3", 100)).toBe(100);
    expect(calculateSubIndex("o3", 168)).toBe(200);

    // CO 1.0 -> 50, 2.0 -> 100, 10.0 -> 200
    expect(calculateSubIndex("co", 1.0)).toBe(50);
    expect(calculateSubIndex("co", 2.0)).toBe(100);
    expect(calculateSubIndex("co", 10.0)).toBe(200);

    // SO2 40 -> 50, 80 -> 100, 380 -> 200
    expect(calculateSubIndex("so2", 40)).toBe(50);
    expect(calculateSubIndex("so2", 80)).toBe(100);
    expect(calculateSubIndex("so2", 380)).toBe(200);
  });

  it("calculates overall AQI as the maximum sub-index and identifies dominant pollutant", () => {
    // When PM2.5 dominates (pm25 = 120 -> 300, no2 = 40 -> 50)
    const resultPm = calculateIndiaAqi({ pm25: 120, no2: 40 });
    expect(resultPm.value).toBe(300);
    expect(resultPm.category).toBe("Poor");
    expect(resultPm.dominantPollutant).toBe("pm25");
    expect(resultPm.source).toBe("computed");

    // When O3 dominates (pm25 = 20 -> 33, o3 = 168 -> 200)
    const resultO3 = calculateIndiaAqi({ pm25: 20, o3: 168 });
    expect(resultO3.value).toBe(200);
    expect(resultO3.category).toBe("Moderate");
    expect(resultO3.dominantPollutant).toBe("o3");
  });

  it("maps categories correctly across all 6 CPCB bands", () => {
    expect(getAqiCategory(30)).toBe("Good");
    expect(getAqiCategory(75)).toBe("Satisfactory");
    expect(getAqiCategory(150)).toBe("Moderate");
    expect(getAqiCategory(250)).toBe("Poor");
    expect(getAqiCategory(350)).toBe("Very poor");
    expect(getAqiCategory(450)).toBe("Severe");
  });

  it("puts values between two bands at the upper band's floor, not below it", () => {
    expect(calculateSubIndex("pm25", 60.5)).toBe(101);
  });

  it("keeps PM2.5 as dominant on a tie and never reports a negative AQI", () => {
    const res = calculateIndiaAqi({ pm25: 0, so2: 0 });
    expect(res.dominantPollutant).toBe("pm25");
    expect(res.value).toBe(0);
  });
});

