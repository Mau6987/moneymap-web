import { describe, expect, it } from "vitest";

import { addAmounts, formatAmount } from "./format";

describe("addAmounts", () => {
  it("suma exacto sin pasar por number (constitución §2)", () => {
    // Con `number`, 0.1 + 0.2 da 0.30000000000000004.
    expect(addAmounts(["0.1", "0.2"])).toBe("0.3");
  });

  it("suma montos con dos decimales sin perder exactitud", () => {
    expect(addAmounts(["69.60", "30.40"])).toBe("100");
  });

  it("devuelve cero con una lista vacía", () => {
    expect(addAmounts([])).toBe("0");
  });
});

describe("formatAmount", () => {
  it("usa coma decimal y punto de miles en es-BO", () => {
    expect(formatAmount("1234.5", 2)).toBe("1.234,50");
  });

  it("redondea de forma exacta cuando la moneda no tiene decimales", () => {
    expect(formatAmount("1234.5", 0)).toBe("1.235");
  });

  it("respeta los decimales de la moneda", () => {
    expect(formatAmount("1000", 0)).toBe("1.000");
    expect(formatAmount("0", 2)).toBe("0,00");
  });

  it("conserva el signo de los montos negativos", () => {
    expect(formatAmount("-500", 2)).toBe("-500,00");
    expect(formatAmount("-1234567.891", 2)).toBe("-1.234.567,89");
  });

  it("rechaza una cantidad de decimales inválida", () => {
    expect(() => formatAmount("10", -1)).toThrow();
    expect(() => formatAmount("10", 1.5)).toThrow();
  });
});
