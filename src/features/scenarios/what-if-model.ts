/**
 * El cálculo del simulador de What If?: las filas con su monto de partida (de la
 * API), cuánto mueve cada slider y el total del periodo. Una sola moneda; todo
 * en `Decimal`, nunca `number` para dinero.
 */
import Decimal from "decimal.js";

import type { WhatIfBase } from "./data/scenarios-gateway";

export type RowKind = "expense" | "income" | "goal";

export interface Row {
  /** Estable entre periodos: `expense:<id>`, `expense:others`, `goal:<id>`… */
  key: string;
  kind: RowKind;
  /** null: "Otros…" o "Sin categoría" (lo resuelve la vista con sus textos). */
  name: string | null;
  others: boolean;
  base: string;
  /** Monto contra el que se mide el slider: la base o, si es cero, una referencia. */
  reference: string;
  /** Dónde arranca el slider: 100 (la base) o 0 si la base es cero. */
  start: number;
}

/** Las 3 categorías de mayor monto; el resto va en "Otros". */
export const TOP = 3;

/**
 * El slider es un multiplicador de la base en centésimas: de 0 a ×3. Un gasto,
 * un ingreso o un aporte a una meta nunca baja de cero. 100 es la base.
 */
export const RANGE: Record<RowKind, { min: number; max: number }> = {
  expense: { min: 0, max: 300 },
  income: { min: 0, max: 300 },
  goal: { min: 0, max: 300 },
};
const BASE_POSITION = 100;

const sum = (amounts: readonly string[]) =>
  amounts.reduce((total, a) => total.plus(a), new Decimal(0));

function grouped(kind: "expense" | "income", items: WhatIfBase["income"]): Row[] {
  const sorted = [...items].sort((a, b) => new Decimal(b.amount).cmp(a.amount));
  const top = sorted.slice(0, TOP).map((item, i) => ({
    key: `${kind}:${item.category_id ?? `none-${i}`}`,
    kind,
    name: item.name,
    others: false,
    base: item.amount,
  }));
  const rest = sum(sorted.slice(TOP).map((item) => item.amount));
  return [
    ...top,
    { key: `${kind}:others`, kind, name: null, others: true, base: rest.toString() },
  ].map((row) => ({ ...row, reference: row.base, start: BASE_POSITION }));
}

/** Las filas del simulador: 3 gastos + Otros gastos, 3 ingresos + Otros ingresos y las metas. */
export function rowsOf(base: WhatIfBase): Row[] {
  const rows: Row[] = [
    ...grouped("expense", base.expenses),
    ...grouped("income", base.income),
    ...base.goals.map((goal) => ({
      key: `goal:${goal.goal_id}`,
      kind: "goal" as const,
      name: goal.name,
      others: false,
      base: goal.period_contribution,
      reference: goal.period_contribution,
      start: BASE_POSITION,
    })),
  ];
  // Una fila en cero también se puede mover: arranca en 0 y se mide contra el
  // mayor monto de su tipo (o 1 si todo está en cero).
  const largest = (kind: RowKind) =>
    Decimal.max(1, ...rows.filter((r) => r.kind === kind).map((r) => r.base));
  return rows.map((row) =>
    new Decimal(row.base).isZero()
      ? { ...row, reference: largest(row.kind).toString(), start: 0 }
      : row,
  );
}

/** El monto de una fila con el slider en `position` (centésimas de su referencia). */
export function amountAt(row: Row, position: number, decimals: number): string {
  if (position === row.start) return new Decimal(row.base).toFixed(decimals);
  return new Decimal(row.reference)
    .times(position)
    .div(100)
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
    .toFixed(decimals);
}

/** Lo que el usuario movió o escribió en cada fila; las que faltan siguen en su base. */
export type Amounts = Readonly<Record<string, string>>;

export const amountOf = (row: Row, amounts: Amounts, decimals: number) =>
  amounts[row.key] ?? new Decimal(row.base).toFixed(decimals);

/**
 * Dónde va el slider para un monto (escrito o movido). Un monto escrito fuera
 * del rango deja el slider en el borde, pero cuenta tal cual en el total.
 */
export function positionFor(row: Row, amount: string): number {
  if (new Decimal(amount).eq(row.base)) return row.start;
  const position = new Decimal(amount).div(row.reference).times(100).round().toNumber();
  const { min, max } = RANGE[row.kind];
  return Math.min(max, Math.max(min, position));
}

/** Lo que suma un tipo de fila (ingresos, gastos o metas), con lo que marca cada una. */
export function sumOf(
  rows: readonly Row[],
  amounts: Amounts,
  kind: RowKind,
  decimals: number,
): string {
  return rows
    .filter((row) => row.kind === kind)
    .reduce((acc, row) => acc.plus(amountOf(row, amounts, decimals)), new Decimal(0))
    .toFixed(decimals);
}

/** Ingresos − gastos − aportes a metas, con lo que marca cada fila. */
export function totalOf(rows: readonly Row[], amounts: Amounts, decimals: number): string {
  const total = rows.reduce((acc, row) => {
    const amount = amountOf(row, amounts, decimals);
    return row.kind === "income" ? acc.plus(amount) : acc.minus(amount);
  }, new Decimal(0));
  return total.toFixed(decimals);
}

/**
 * Cuándo llega una meta aportando `periodAmount` cada periodo: lo que falta
 * entre el aporte mensual, en meses enteros hacia arriba. null si no aporta o
 * tardaría más de 100 años (como la API).
 */
export function goalMonthsLeft(
  goal: WhatIfBase["goals"][number],
  periodAmount: string,
  periodsPerYear: number,
): number | null {
  const remaining = new Decimal(goal.target_amount).minus(goal.current_amount);
  if (remaining.lte(0)) return 0;
  const monthly = new Decimal(periodAmount).times(periodsPerYear).div(12);
  if (monthly.lte(0)) return null;
  const months = remaining.div(monthly).ceil();
  return months.gt(1200) ? null : months.toNumber();
}
