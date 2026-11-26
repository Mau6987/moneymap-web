/**
 * El catálogo de monedas como lo da `GET /v1/currencies`: Mis monedas primero.
 *
 * Constitución §2: cada moneda va por separado. Nada aquí convierte ni suma
 * monedas distintas.
 */
import type { components } from "@/lib/api/generated/schema";

export type CurrencyInfo = components["schemas"]["CurrencyRead"];

export class CurrencyCatalog {
  private readonly byCode: ReadonlyMap<string, CurrencyInfo>;

  constructor(readonly currencies: readonly CurrencyInfo[]) {
    this.byCode = new Map(currencies.map((c) => [c.code, c]));
  }

  get(code: string): CurrencyInfo | undefined {
    return this.byCode.get(code);
  }

  /** La principal, o la primera si ninguna está marcada. */
  get main(): CurrencyInfo | undefined {
    return this.currencies.find((c) => c.is_main_currency) ?? this.currencies[0];
  }

  /** Los decimales de la moneda (`minor_units`); 2 si no está en el catálogo. */
  decimalsOf(code: string): number {
    return this.byCode.get(code)?.decimals ?? 2;
  }

  /**
   * Lo que va delante de un monto (spec 002, RF-10): el símbolo, o el código
   * cuando otra moneda del usuario comparte ese símbolo ($ de USD y de ARS).
   */
  labelOf(code: string): string {
    const currency = this.byCode.get(code);
    if (!currency) return code;
    const shared = this.currencies.filter(
      (c) => (c.is_mine || c.code === code) && c.symbol === currency.symbol,
    ).length;
    return shared > 1 ? code : currency.symbol;
  }

  /** Mis monedas, con la principal primero. */
  get mine(): CurrencyInfo[] {
    return [
      ...this.currencies.filter((c) => c.is_main_currency),
      ...this.currencies.filter((c) => c.is_mine && !c.is_main_currency),
    ];
  }

  /**
   * Ordena los códigos como el selector: la principal, Mis monedas y el resto,
   * con las que no están en el catálogo al final.
   */
  order(codes: Iterable<string>): string[] {
    const wanted = new Set(codes);
    const known = [...this.mine, ...this.currencies.filter((c) => !c.is_mine)]
      .map((c) => c.code)
      .filter((code, i, all) => wanted.has(code) && all.indexOf(code) === i);
    return [...known, ...[...wanted].filter((code) => !known.includes(code))];
  }
}
