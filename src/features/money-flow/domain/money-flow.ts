import Decimal from "decimal.js";

/** Un mes como lo pide la API (`AAAA-MM`). */
export const isPeriod = (value: string | undefined): value is string =>
  !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** El mes de una fecha ISO. */
export const periodOf = (iso: string) => iso.slice(0, 7);

/** El mes anterior o el siguiente de `period`. */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * El porcentaje entero de `part` sobre el ingreso, para leerlo junto a su
 * monto. Es la misma moneda: no suma ni convierte nada.
 */
export function percentOf(part: string, income: string): number {
  const total = new Decimal(income);
  if (total.lte(0)) return 0;
  return new Decimal(part).div(total).times(100).toDecimalPlaces(0).toNumber();
}

/** La referencia de la regla 50/30/20 que muestra el mockup. */
export const RULE = { needs: 50, lifestyle: 30, goals: 20 } as const;
