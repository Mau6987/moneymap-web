/**
 * Montos.
 *
 * Reglas de la constitución §2:
 *   - Nunca `number` para dinero. La aritmética va con `decimal.js`.
 *   - Los montos llegan de la API como texto ("69.60"), nunca como número.
 *   - El formato es es-BO: coma decimal, punto de miles.
 *   - Los decimales son los de la moneda (2 en BOB y USD, 0 en CLP y PYG).
 */
import Decimal from "decimal.js";

/** Suma montos exactos que llegan como texto. Nunca pasa por `number`. */
export function addAmounts(amounts: readonly string[]): string {
  return amounts
    .reduce((total, amount) => total.plus(new Decimal(amount)), new Decimal(0))
    .toString();
}

/**
 * Formatea un monto para mostrarlo, con los decimales de su moneda.
 *
 * El redondeo y el agrupado se hacen sobre el valor decimal, no sobre un
 * `number`, para no perder exactitud en montos grandes.
 */
export function formatAmount(amount: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`decimals tiene que ser un entero mayor o igual a 0; llegó ${decimals}`);
  }

  const fixed = new Decimal(amount).toFixed(decimals);
  const negative = fixed.startsWith("-");
  const [integerPart = "0", fractionPart = ""] = (negative ? fixed.slice(1) : fixed).split(".");

  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted = decimals > 0 ? `${grouped},${fractionPart}` : grouped;

  return negative ? `-${formatted}` : formatted;
}
