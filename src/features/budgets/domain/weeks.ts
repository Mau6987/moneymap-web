import Decimal from "decimal.js";

import type { Budget } from "../../map/data/map-gateway";

const dayIndex = (start: string, iso: string) =>
  Math.round((Date.parse(iso) - Date.parse(start)) / 86_400_000);

/**
 * Lo gastado en cada semana del mes (días 1-7, 8-14…), sumando el `spent`
 * diario de la API. Solo para dibujar las barras del mockup: el total del mes
 * que se muestra es siempre el `spent` de la API.
 */
export function weeklySpend(budget: Budget): string[] {
  const days = dayIndex(budget.period_starts_on, budget.period_ends_on) + 1;
  const weeks = Array.from({ length: Math.max(1, Math.ceil(days / 7)) }, () => new Decimal(0));
  for (const d of budget.daily) {
    const week = Math.floor(dayIndex(budget.period_starts_on, d.on) / 7);
    if (week >= 0 && week < weeks.length) weeks[week] = weeks[week]!.plus(d.spent);
  }
  return weeks.map((w) => w.toString());
}
