import { describe, expect, it } from "vitest";

import { CurrencyCatalog, type CurrencyInfo } from "./currency";
import { HIDDEN_AMOUNT, formatMoney, formatNumber, shareOf } from "./money";

const currency = (
  code: string,
  symbol: string,
  extra: Partial<CurrencyInfo> = {},
): CurrencyInfo => ({
  code,
  name: code,
  symbol,
  decimals: 2,
  is_active: true,
  is_mine: false,
  is_main_currency: false,
  ...extra,
});

const catalog = new CurrencyCatalog([
  currency("BOB", "Bs", { is_mine: true, is_main_currency: true }),
  currency("USD", "$", { is_mine: true }),
  currency("ARS", "$"),
  currency("CLP", "$", { decimals: 0 }),
]);

describe("CurrencyCatalog", () => {
  it("RF-10 uses the symbol while no other currency of mine shares it", () => {
    expect(catalog.labelOf("USD")).toBe("$");
    expect(
      new CurrencyCatalog([...catalog.currencies, currency("MXN", "$", { is_mine: true })]).labelOf(
        "USD",
      ),
    ).toBe("USD");
  });

  it("orders the main one first, then Mis monedas, then the rest", () => {
    expect(catalog.order(["CLP", "USD", "BOB", "XYZ"])).toEqual(["BOB", "USD", "CLP", "XYZ"]);
    expect(catalog.mine.map((c) => c.code)).toEqual(["BOB", "USD"]);
  });
});

describe("formatMoney", () => {
  it("drops zero cents and groups thousands the es-BO way", () => {
    expect(formatMoney("1000.00", "BOB", catalog)).toBe("Bs 1.000");
    expect(formatMoney("2500.50", "BOB", catalog)).toBe("Bs 2.500,50");
    expect(formatMoney("0.00", "BOB", catalog, { keepZeroDecimals: true })).toBe("Bs 0,00");
  });

  it("keeps a negative amount negative", () => {
    expect(formatMoney("-500.00", "BOB", catalog)).toBe("Bs −500");
    expect(formatMoney("6300.00", "BOB", catalog, { sign: "−" })).toBe("−Bs 6.300");
    expect(formatMoney("12000.00", "BOB", catalog, { sign: "+" })).toBe("+Bs 12.000");
  });

  it("hides the number in private mode", () => {
    expect(formatMoney("1000.00", "BOB", catalog, { hidden: true })).toBe(`Bs ${HIDDEN_AMOUNT}`);
  });

  it("a currency without decimals has none", () => {
    expect(formatNumber("1500", 0)).toBe("1.500");
  });
});

describe("shareOf", () => {
  it("goes from 0 to 1 and never divides by zero", () => {
    expect(shareOf("250", "1000")).toBe(0.25);
    expect(shareOf("1500", "1000")).toBe(1);
    expect(shareOf("-10", "1000")).toBe(0);
    expect(shareOf("10", "0")).toBe(0);
  });
});
