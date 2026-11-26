/**
 * Lee un monto escrito por el usuario, al modo es-BO, y lo devuelve como el
 * texto que espera la API ("1500.50"), o null si no es un monto válido.
 *
 * - La coma es el decimal y el punto agrupa miles: "1.500,50".
 * - Sin coma, un punto seguido de exactamente 3 dígitos agrupa miles ("1.500");
 *   cualquier otro punto pegado se toma como decimal ("12.5").
 * - Nunca pasa por `number`: la exactitud la da `decimal.js`.
 */
import Decimal from "decimal.js";

/** Un monto de más de 15 dígitos enteros no cabe en numeric(19,4). */
const MAX_WHOLE_DIGITS = 15;

export interface ParseOptions {
  decimals: number;
  /** Acepta cero (el saldo inicial de una cuenta). Por omisión, solo positivos. */
  allowZero?: boolean;
}

export function parseAmount(
  text: string,
  { decimals, allowZero = false }: ParseOptions,
): string | null {
  const raw = text.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(raw)) return null;

  let normalized: string;
  if (raw.includes(",")) {
    if (raw.indexOf(",") !== raw.lastIndexOf(",")) return null;
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "");
  } else if ((raw.match(/\./g) ?? []).length <= 1) {
    normalized = raw;
  } else {
    return null;
  }

  const [whole = "", fraction = ""] = normalized.split(".");
  if (whole.replace(/^0+(?=\d)/, "").length > MAX_WHOLE_DIGITS) return null;
  if (fraction.length > decimals) return null;

  const value = new Decimal(normalized);
  if (value.isNegative() || (!allowZero && value.isZero())) return null;
  return value.toFixed(decimals);
}
