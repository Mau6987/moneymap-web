import { amountsHidden } from "@/lib/privacy";
import Decimal from "decimal.js";

import { withAccessToken } from "@/lib/auth/session";
import { CurrencyCatalog } from "@/lib/money/currency";

import type { Budget, Category } from "../map/data/map-gateway";
import { mapGateway } from "../map/data/map-gateway";
import { byUse } from "../quick-add/domain/categories";
import { transactionsGateway } from "../transactions/data/transactions-gateway";
import { budgetsGateway } from "./data/budgets-gateway";

/** Se pasó o va más rápido que el mes: lo que cuenta "En riesgo". */
export function isAtRisk(budget: Budget): boolean {
  return (
    new Decimal(budget.remaining).isNegative() ||
    budget.pace.status === "too_fast" ||
    budget.pace.status === "a_bit_fast"
  );
}

/** Las categorías de gasto sin presupuesto en cada moneda (uno por categoría y moneda). */
export function freeByCurrency(
  categories: Category[],
  budgets: Budget[],
  codes: string[],
): Record<string, { id: string; name: string; color: string }[]> {
  return Object.fromEntries(
    codes.map((code) => [
      code,
      categories
        .filter((c) => c.type === "expense")
        .filter((c) => !budgets.some((b) => b.category_id === c.id && b.currency === code))
        .map(({ id, name, color }) => ({ id, name, color })),
    ]),
  );
}

export async function loadBudgets() {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const [budgets, categories, currencies, preferences] = await Promise.all([
      budgetsGateway().budgets(token),
      map.categories(token).catch(() => []),
      map.currencies(token),
      map.preferences(token).catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    return {
      budgets,
      categories,
      catalog: new CurrencyCatalog(currencies),
      hidden: hiddenAmounts,
    };
  });
}

/** Los últimos gastos de la categoría y la moneda del presupuesto, en su mes. */
export async function recentExpenses(budget: Budget) {
  return withAccessToken(async (token) =>
    (
      await transactionsGateway().list(token, {
        category_id: budget.category_id,
        currency: budget.currency,
        from: budget.period_starts_on,
        to: budget.period_ends_on,
        limit: 5,
      })
    ).items.filter((t) => t.kind === "expense"),
  );
}

/**
 * Las categorías con las más usadas en los últimos movimientos primero
 * (MM-179), para que "Nuevo presupuesto" muestre esas antes de "Más".
 */
export async function byRecentUse(categories: Category[]) {
  const recent = await withAccessToken((token) =>
    transactionsGateway()
      .list(token, { limit: 100 })
      .then((page) => page.items)
      .catch(() => []),
  );
  return byUse(categories, recent);
}
