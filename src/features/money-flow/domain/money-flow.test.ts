import { describe, expect, it } from "vitest";

import { isPeriod, percentOf, shiftPeriod } from "./money-flow";

describe("Money Flow", () => {
  it("moves between months, across the year too", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(isPeriod("2026-10")).toBe(true);
    expect(isPeriod("2026-13")).toBe(false);
  });

  it("RF-7 each group as a whole percent of the income, never dividing by zero", () => {
    expect(percentOf("3800.00", "12000.00")).toBe(32);
    expect(percentOf("100.00", "0.00")).toBe(0);
  });
});
