import { catalogs } from "@/lib/i18n/catalog";

import type { MyFeature, MyPlan, Plan, PlanPrice } from "../data/plans-gateway";

type Labels = Partial<Record<string, string>>;

/** El nombre corto de un límite; uno que la web no conoce usa la descripción de la API. */
export const featureLabel = (
  key: string,
  description: string,
  labels: Labels = catalogs.es.plans.features,
) => labels[key] ?? description;

/** El precio en `currency` o, si no hay, el primero que da la API. Vacío en el gratuito. */
export function priceIn(plan: Plan, currency: string): PlanPrice | undefined {
  return plan.prices.find((p) => p.currency === currency) ?? plan.prices[0];
}

/** Los límites que ya alcanzó ("1 de 1 tarjetas"). */
export function fullFeatures(mine: MyPlan): MyFeature[] {
  return mine.features.filter((f) => f.limit !== null && f.used !== null && f.used >= f.limit);
}

/** Las filas de la comparación: cada límite de cada plan, en el orden de la API, una vez. */
export function comparisonRows(
  plans: readonly Plan[],
  labels?: Labels,
): { key: string; description: string }[] {
  const seen = new Set<string>();
  const rows: { key: string; description: string }[] = [];
  for (const plan of plans) {
    for (const f of plan.features) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      rows.push({ key: f.key, description: featureLabel(f.key, f.description, labels) });
    }
  }
  return rows;
}

export type Cell =
  { kind: "off" } | { kind: "on" } | { kind: "unlimited" } | { kind: "limit"; limit: number };

/** Qué va en la celda de un plan: no incluido, incluido, sin límite o el límite. */
export function cellOf(plan: Plan, key: string): Cell {
  const f = plan.features.find((x) => x.key === key);
  if (!f || !f.enabled) return { kind: "off" };
  if (f.period === null) return { kind: "on" };
  return f.limit === null ? { kind: "unlimited" } : { kind: "limit", limit: f.limit };
}

/** Empieza en el plan que sigue al propio, como el mockup. */
export function initialSelection(plans: readonly Plan[], mine: MyPlan): string {
  return plans.find((p) => p.tier > mine.tier)?.code ?? mine.code;
}
