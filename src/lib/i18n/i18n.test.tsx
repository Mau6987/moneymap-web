// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuickAddForm } from "@/features/quick-add/components/quick-add-form";
import { longDate, monthName, shortDate } from "@/lib/dates";

import { catalogs } from "./catalog";
import { LocaleProvider } from "./client";
import { LOCALES, languageChoices, resolveLocale } from "./locale";
import { moneyErrorText } from "./money-messages";

vi.mock("@/features/quick-add/quick-add-action", () => ({ registerTransaction: vi.fn() }));

/** Todas las claves de un objeto de textos, anidadas ("nav.map"). */
const keysOf = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe("Idioma (MM-172, spec 001 RF-19)", () => {
  it("the cookie wins; with System it follows Accept-Language; otherwise Spanish", () => {
    expect(resolveLocale("en", "pt-BR,pt;q=0.9", LOCALES)).toBe("en");
    expect(resolveLocale(undefined, "pt-BR,pt;q=0.9,en;q=0.8", LOCALES)).toBe("pt");
    expect(resolveLocale("system", "en-US,en;q=0.9", LOCALES)).toBe("en");
    expect(resolveLocale(undefined, "fr-FR,de;q=0.8", LOCALES)).toBe("es");
    expect(resolveLocale(undefined, null, LOCALES)).toBe("es");
    expect(languageChoices(LOCALES)).toEqual(["system", "es", "en", "pt"]);
  });

  it("BUG-018 for now only Spanish is offered, whatever the cookie or the browser say", () => {
    expect(resolveLocale("en", "en-US,en;q=0.9")).toBe("es");
    expect(resolveLocale("pt", null)).toBe("es");
    expect(resolveLocale("system", "pt-BR,pt;q=0.9")).toBe("es");
    expect(languageChoices()).toEqual(["es"]);
  });

  it("English and Portuguese have every text Spanish has", () => {
    const es = keysOf(catalogs.es).sort();
    expect(keysOf(catalogs.en).sort()).toEqual(es);
    expect(keysOf(catalogs.pt).sort()).toEqual(es);
  });

  it("dates follow the language; amounts stay es-BO", () => {
    expect(shortDate("2026-11-13", "es")).toBe("13 nov");
    expect(shortDate("2026-11-13", "en")).toBe("Nov 13");
    expect(longDate("2026-11-13", "pt")).toBe("13 de novembro de 2026");
    expect(monthName("2026-10-01", "en")).toBe("October");
  });

  it("the API's error codes read in the language", () => {
    expect(moneyErrorText("invalid_amount", "en")).toBe("Check the amount");
    expect(moneyErrorText("nope", "pt")).toBe("Algo deu errado. Tente de novo.");
  });

  it("a browser component reads its texts from the provider", () => {
    render(
      <LocaleProvider locale="en">
        <QuickAddForm
          action={vi.fn()}
          accounts={[
            { id: "a", name: "Cash", currency: "BOB", label: "Bs", decimals: 2, isDefault: true },
          ]}
          categories={[]}
          today="2026-10-26"
          idempotencyKey="k"
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole("radio", { name: "Expense" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByText("In BOB, the account's currency")).toBeTruthy();
  });
});
