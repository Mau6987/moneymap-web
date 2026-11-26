import Decimal from "decimal.js";

import { monthName } from "@/lib/dates";

import type { StoryHighlight } from "../data/money-story-gateway";

import { catalogs, type Messages } from "@/lib/i18n/catalog";
import type { Locale } from "@/lib/i18n/locale";
/** Cuántos meses van de `from` a `to` (`AAAA-MM`); negativo si `to` es antes. */
export function monthsBetween(from: string, to: string): number {
  const index = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7));
  return index(to) - index(from);
}

/** El porcentaje entero de ahorro, o null sin ingresos (RF-1). 0.2700 es 27. */
export function savingsPercent(rate: string | null): number | null {
  return rate === null ? null : new Decimal(rate).times(100).toDecimalPlaces(0).toNumber();
}

/**
 * La diferencia contra el mes anterior en la misma moneda, para leer
 * "↑ Bs 240" o "↓ Bs 240". Subir o bajar no es bueno ni malo (RF-5).
 */
export function changeOf(now: string, before: string): { arrow: "↑" | "↓" | null; amount: string } {
  const difference = new Decimal(now).minus(before);
  return {
    arrow: difference.isZero() ? null : difference.gt(0) ? "↑" : "↓",
    amount: difference.abs().toFixed(),
  };
}

const monthOf = (period: string | undefined, locale: Locale) =>
  monthName(`${period ?? "2000-01"}-01`, locale).toLowerCase();

/**
 * La frase de un destacado con los montos formateados (o tapados en modo
 * privado), o null si la clave es nueva para esta versión: mejor saltarla que
 * mostrar una clave cruda (RF-4). `first_month` ya lo explica la pantalla.
 */
export function highlightText(
  highlight: StoryHighlight,
  money: (amount: string) => string,
  t: Messages["moneyStory"] = catalogs.es.moneyStory,
  locale: Locale = "es",
): string | null {
  const p = highlight.params;
  const m = (name: string) => money(p[name] ?? "0");
  switch (highlight.key) {
    case "summary":
      return t.summary(monthOf(p.month, locale), m("income"), m("expense"));
    case "saved":
      return t.saved(m("savings"), p.rate ?? "");
    case "overspent":
      return t.overspent(m("deficit"));
    case "balanced":
      return t.balanced;
    case "top_expense_category":
      return t.topCategory(p.category ?? "", m("amount"));
    case "goals_contributed":
      return t.goalsContributed(m("amount"));
    case "income_up":
      return t.incomeUp(m("difference"), monthOf(p.previous_month, locale));
    case "income_down":
      return t.incomeDown(m("difference"), monthOf(p.previous_month, locale));
    case "income_same":
      return t.incomeSame(monthOf(p.previous_month, locale));
    case "savings_up":
      return t.savingsUp(m("difference"), monthOf(p.previous_month, locale));
    case "savings_down":
      return t.savingsDown(m("difference"), monthOf(p.previous_month, locale));
    case "savings_same":
      return t.savingsSame(monthOf(p.previous_month, locale));
    default:
      return null;
  }
}
