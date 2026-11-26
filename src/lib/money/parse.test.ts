import { describe, expect, it } from "vitest";

import { parseAmount } from "./parse";

describe("parseAmount", () => {
  it("reads the es-BO way: comma decimals, dot thousands", () => {
    expect(parseAmount("1.500,50", { decimals: 2 })).toBe("1500.50");
    expect(parseAmount("1.500", { decimals: 2 })).toBe("1500.00");
    expect(parseAmount("35", { decimals: 2 })).toBe("35.00");
  });

  it("a pasted dot counts as the decimal point", () => {
    expect(parseAmount("12.5", { decimals: 2 })).toBe("12.50");
  });

  it("RF-5 takes only the decimals of the currency", () => {
    expect(parseAmount("10,555", { decimals: 2 })).toBeNull();
    expect(parseAmount("1500", { decimals: 0 })).toBe("1500");
    expect(parseAmount("15,5", { decimals: 0 })).toBeNull();
  });

  it("rejects zero, negatives, letters and more than 15 whole digits", () => {
    expect(parseAmount("0", { decimals: 2 })).toBeNull();
    expect(parseAmount("0", { decimals: 2, allowZero: true })).toBe("0.00");
    expect(parseAmount("-5", { decimals: 2 })).toBeNull();
    expect(parseAmount("abc", { decimals: 2 })).toBeNull();
    expect(parseAmount("1234567890123456", { decimals: 2 })).toBeNull();
  });
});
