/**
 * Un monto listo para mostrar: su etiqueta (símbolo o código) y el número en
 * es-BO. Los montos llegan de la API como texto y nunca pasan por `number`.
 */
import Decimal from "decimal.js";

import type { CurrencyCatalog } from "./currency";
import { formatAmount } from "./format";

/** Lo que se muestra en lugar de los montos con el modo privado. */
export const HIDDEN_AMOUNT = "••••";

export interface MoneyOptions {
  /** Muestra los decimales aunque sean cero ("Bs 0,00"). Por omisión no. */
  keepZeroDecimals?: boolean;
  /** Antepone "+" o "−" (ingresos y gastos); el número va sin signo. */
  sign?: "+" | "−";
  /** El modo privado: oculta el número y deja la etiqueta. */
  hidden?: boolean;
}

/** El número en es-BO, sin etiqueta. "1.000", "2.500,50", "−500". */
export function formatNumber(amount: string, decimals: number, keepZeroDecimals = false): string {
  const value = new Decimal(amount);
  const places = keepZeroDecimals || !value.isInteger() ? decimals : 0;
  const text = formatAmount(value.abs().toString(), places);
  return value.isNegative() && !value.isZero() ? `−${text}` : text;
}

/**
 * "Bs 1.000", "−Bs 6.300" con `sign`, o "Bs −500" para un monto negativo
 * (constitución §2: un negativo se muestra negativo, nunca en cero).
 */
export function formatMoney(
  amount: string,
  currency: string,
  catalog: CurrencyCatalog,
  options: MoneyOptions = {},
): string {
  const label = catalog.labelOf(currency);
  if (options.hidden) return `${options.sign ?? ""}${label} ${HIDDEN_AMOUNT}`;
  const decimals = catalog.decimalsOf(currency);
  if (options.sign) {
    const number = formatNumber(
      new Decimal(amount).abs().toString(),
      decimals,
      options.keepZeroDecimals,
    );
    return `${options.sign}${label} ${number}`;
  }
  return `${label} ${formatNumber(amount, decimals, options.keepZeroDecimals)}`;
}

/** De 0 a 1, `part` sobre `whole`, solo para dibujar barras y anillos. */
export function shareOf(part: string, whole: string): number {
  const total = new Decimal(whole);
  if (total.lte(0)) return 0;
  return Decimal.min(1, Decimal.max(0, new Decimal(part).div(total))).toNumber();
}
