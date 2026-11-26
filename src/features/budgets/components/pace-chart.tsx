import Decimal from "decimal.js";

import type { Budget } from "../../map/data/map-gateway";

const dayIndex = (start: string, iso: string) =>
  Math.round((Date.parse(iso) - Date.parse(start)) / 86_400_000);

/**
 * El gasto acumulado del mes (`daily` de la API) contra el ritmo ideal, que va
 * de cero al límite a lo largo del mes, y la proyección al cierre punteada.
 * Solo dibuja: los montos se leen en la tarjeta, nunca aquí.
 */
export function PaceChart({
  budget,
  today,
  label,
}: {
  budget: Budget;
  today: string;
  label: string;
}) {
  const days = dayIndex(budget.period_starts_on, budget.period_ends_on) + 1;
  const limit = new Decimal(budget.amount);
  const projected = new Decimal(budget.pace.projected_total);
  const top = Decimal.max(limit, projected, new Decimal(budget.spent)).times(1.1);
  if (top.lte(0) || days <= 0) return null;

  const width = 300;
  const height = 120;
  const x = (day: number) => 6 + (day / days) * (width - 12);
  const y = (value: Decimal) => height - 6 - value.div(top).toNumber() * (height - 12);
  const elapsed = Math.min(days, Math.max(0, dayIndex(budget.period_starts_on, today) + 1));

  const points: [number, Decimal][] = [[0, new Decimal(0)]];
  for (const d of budget.daily) {
    points.push([dayIndex(budget.period_starts_on, d.on) + 1, new Decimal(d.cumulative)]);
  }
  points.push([elapsed, new Decimal(budget.spent)]);
  const line = points.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  // Coral si se pasó o va "Muy rápido", como su etiqueta.
  const over = new Decimal(budget.remaining).isNegative() || budget.pace.status === "too_fast";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" role="img" aria-label={label}>
      <line
        x1={x(0)}
        y1={y(limit)}
        x2={x(days)}
        y2={y(limit)}
        strokeDasharray="3 4"
        strokeWidth="1.2"
        className="stroke-[var(--mm-muted)]"
      />
      <line
        x1={x(0)}
        y1={y(new Decimal(0))}
        x2={x(days)}
        y2={y(limit)}
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-[var(--mm-green)]"
      />
      <polyline
        points={line}
        fill="none"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={over ? "stroke-[var(--mm-coral)]" : "stroke-[var(--mm-primary)]"}
      />
      {budget.pace.status && (
        <line
          x1={x(elapsed)}
          y1={y(new Decimal(budget.spent))}
          x2={x(days)}
          y2={y(projected)}
          strokeDasharray="6 6"
          strokeWidth="3"
          strokeLinecap="round"
          className={over ? "stroke-[var(--mm-coral)]" : "stroke-[var(--mm-primary)]"}
        />
      )}
    </svg>
  );
}
