import Decimal from "decimal.js";

import type { Position, SafeToSpend } from "../data/map-gateway";

/** Días calendario entre dos fechas ISO (`AAAA-MM-DD`), sin horas ni zonas. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** La fecha de hoy como `AAAA-MM-DD`, en la hora local de quien mira. */
export function isoToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Cuántos días quedan del periodo, sin contar hoy; nunca negativo. */
export function daysLeft(periodEndsOn: string, today: string): number {
  return Math.max(0, daysBetween(today, periodEndsOn));
}

/** De 0 a 1, cuánto del periodo pasó: la marca de las barras. Solo dibuja. */
export function periodElapsed(startsOn: string, endsOn: string, today: string): number {
  const total = daysBetween(startsOn, endsOn) + 1;
  const gone = daysBetween(startsOn, today) + 1;
  return total <= 0 ? 0 : Math.min(1, Math.max(0, gone / total));
}

/** El día del periodo y cuántos tiene ("día 12 de 30"). */
export function periodDay(startsOn: string, endsOn: string, today: string): [number, number] {
  const total = daysBetween(startsOn, endsOn) + 1;
  return [Math.min(total, Math.max(1, daysBetween(startsOn, today) + 1)), total];
}

/** Spec 004, RF-5: sin ingresos, gastos ni ahorro en el periodo, el Map vacío. */
export function hasNoMovements(position: Position): boolean {
  return [position.income, position.expenses, position.saved].every((a) => new Decimal(a).isZero());
}

/**
 * El Map vacío: sin movimientos y sin dinero en las cuentas. Una persona
 * nueva con saldo inicial no tiene movimientos pero sí dinero: ve su Map con
 * lo disponible, no la tarjeta vacía (BUG-038).
 */
export function isEmptyMap(position: Position): boolean {
  return hasNoMovements(position) && new Decimal(position.available_balance).isZero();
}

/** Spec 003, RF-9: las obligaciones superan el saldo. */
export function isNegative(sts: SafeToSpend): boolean {
  return new Decimal(sts.amount).isNegative();
}

/**
 * De 0 a 1, cuánto del saldo sigue libre, solo para el anillo. Todos los
 * montos que se leen en pantalla son los de la API.
 */
export function freeShare(sts: SafeToSpend): number {
  const balance = new Decimal(sts.breakdown.current_balance);
  const amount = new Decimal(sts.amount);
  if (balance.lte(0) || amount.lte(0)) return 0;
  return Decimal.min(1, amount.div(balance)).toNumber();
}

/** Lo mínimo que se dibuja de cada parte del anillo, para que siempre se vea. */
export const MIN_RING_SHARE = 0.06;

/**
 * Las tres partes del anillo alrededor del total: lo que ya salió y las
 * cuentas por pagar del periodo (las dos en rojo) y lo libre (verde), de 0 a 1 sobre el saldo más lo gastado. Una parte que no es cero
 * nunca es más fina que el mínimo. Solo dibuja: los montos son los de la API.
 */
export function ringParts(
  sts: SafeToSpend,
  position: Position,
): { spent: number; payables: number; free: number } {
  return ringShares({
    balance: sts.breakdown.current_balance,
    spent: position.expenses,
    payables: sts.breakdown.pending_recurring,
    free: sts.amount,
  });
}

/**
 * Las partes del anillo con los montos sueltos, para dibujar el mismo anillo
 * fuera del Map (BUG-048: el último paso del onboarding). Solo para dibujar.
 */
export function ringShares(amounts: {
  balance: string;
  spent: string;
  payables: string;
  free: string;
}): { spent: number; payables: number; free: number } {
  const balance = new Decimal(amounts.balance);
  const spent = new Decimal(amounts.spent);
  const base = Decimal.max(balance, 0).plus(spent);
  if (base.lte(0)) return { spent: 0, payables: 0, free: 0 };
  const share = (value: Decimal) =>
    value.lte(0) ? 0 : Math.min(1, Math.max(MIN_RING_SHARE, value.div(base).toNumber()));
  const spentPart = share(spent);
  const payables = Math.min(share(new Decimal(amounts.payables)), 1 - spentPart);
  const free = Math.min(share(new Decimal(amounts.free)), 1 - spentPart - payables);
  return { spent: spentPart, payables, free };
}

/** Cuántos meses ofrece el selector del Map, contando el actual (BUG-025 de la app). */
export const MONTHS_BACK = 12;

/** El primer día de los últimos `MONTHS_BACK` meses, el actual primero ("2026-11-01"). */
export function recentMonths(today: string): string[] {
  const [year, month] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
}

/**
 * El mes pasado que pide `?month=2026-09`, como "2026-09-01". El actual, uno
 * futuro o uno más viejo que el selector cuentan como el periodo de hoy (null).
 */
export function pastMonth(param: string | undefined, today: string): string | null {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null;
  const months = recentMonths(today);
  const month = `${param}-01`;
  return months.slice(1).includes(month) ? month : null;
}

/** El último día de un mes ("2026-09-01" → "2026-09-30"). */
export function monthEnd(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(year, m, 0).getDate();
  return `${month.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}
