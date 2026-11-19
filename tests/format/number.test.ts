import { describe, expect, it } from "vitest";
import { formatMicrograms } from "@/lib/format/number";

describe("Number Formatting", () => {
  it("formats integer microgram doses with Indian digit grouping", () => {
    expect(formatMicrograms(0)).toBe("0");
    expect(formatMicrograms(450)).toBe("450");
    expect(formatMicrograms(1250)).toBe("1,250");
    expect(formatMicrograms(45000)).toBe("45,000");
    expect(formatMicrograms(100000)).toBe("1,00,000");
    expect(formatMicrograms(1234567)).toBe("12,34,567");
  });

  it("rounds decimal microgram values before grouping", () => {
    expect(formatMicrograms(450.4)).toBe("450");
    expect(formatMicrograms(450.6)).toBe("451");
    expect(formatMicrograms(999.9)).toBe("1,000");
  });

  it("handles non-finite numbers safely", () => {
    expect(formatMicrograms(NaN)).toBe("0");
    expect(formatMicrograms(Infinity)).toBe("0");
  });
});
