import { amountsHidden } from "@/lib/privacy";
import { cache } from "react";

import { recurringGateway, type RecurringRule } from "@/features/recurring/data/recurring-gateway";
import {
  type Account,
  transactionsGateway,
} from "@/features/transactions/data/transactions-gateway";
import { dueRules } from "@/features/recurring/domain/due";
import { withAccessToken } from "@/lib/auth/session";
import { CurrencyCatalog } from "@/lib/money/currency";

import {
  mapGateway,
  type Balance,
  type Budget,
  type Category,
  type Forecast,
  type MoneyFlow,
  type Position,
  type SafeToSpend,
} from "./data/map-gateway";
import { isoToday } from "./domain/map";

/** "Todas": cada moneda por separado, nunca un total (spec 004, RF-3). */
export const ALL_CURRENCIES = "ALL";

/** Un bloque de una moneda: su Safe to Spend y su periodo. */
export interface CurrencyBlock {
  balance: Balance;
  safeToSpend: SafeToSpend;
  position: Position;
}

/**
 * Lo que muestra el Map de una sola moneda, lo mismo que la app (BUG-040).
 * Las tarjetas que fallan quedan en null.
 */
export interface CurrencyMap extends CurrencyBlock {
  forecast: Forecast | null;
  moneyFlow: MoneyFlow | null;
  budgets: Budget[] | null;
  /** Los gastos fijos de la moneda que vencen hoy o ya vencieron: los pagos de hoy. */
  due: RecurringRule[] | null;
  /** "Completa tu mapa": si ya hay ingresos y gastos fijos; null si no cargaron. */
  setup: { hasIncome: boolean; hasExpenses: boolean } | null;
  /** Las cuentas activas de la moneda, para Efectivo y Tarjeta. */
  accounts: Account[] | null;
}

export interface MapData {
  catalog: CurrencyCatalog;
  /** Las monedas con cuentas, la principal primero. */
  codes: string[];
  /** La moneda elegida, o `ALL_CURRENCIES`. */
  selected: string;
  hidden: boolean;
  /** El modo privado de Ajustes: con él, el ojo de la barra muestra u oculta (spec 001 RF-15). */
  privateMode: boolean;
  categories: Category[];
  single: CurrencyMap | null;
  all: CurrencyBlock[] | null;
}

/** Lo que falla en una tarjeta secundaria no tira el Map: queda en null. */
async function optional<T>(call: Promise<T>): Promise<T | null> {
  try {
    return await call;
  } catch {
    return null;
  }
}

/**
 * Carga el Map (specs 003 y 004) en la moneda pedida, o en la principal.
 * Lanza `ApiError` si falta lo esencial (RF-15: nunca un Map en ceros).
 */
export const loadMap = cache(async (requested?: string): Promise<MapData> =>
  withAccessToken(async (token) => {
    const gateway = mapGateway();
    const [currencies, balances, preferences, categories] = await Promise.all([
      gateway.currencies(token),
      gateway.balances(token),
      optional(gateway.preferences(token)),
      optional(gateway.categories(token)),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    const withAccounts = balances.filter((b) => b.accounts > 0);
    const codes = catalog.order(withAccounts.map((b) => b.currency));
    const main = withAccounts.find((b) => b.is_main_currency)?.currency ?? codes[0];
    const selected =
      requested === ALL_CURRENCIES && codes.length > 1
        ? ALL_CURRENCIES
        : requested && codes.includes(requested)
          ? requested
          : main;
    const base = {
      catalog,
      codes,
      selected: selected ?? "",
      hidden: hiddenAmounts,
      privateMode: preferences?.hide_amounts ?? false,
      categories: categories ?? [],
    };
    if (!selected) return { ...base, single: null, all: null };

    const block = async (code: string): Promise<CurrencyBlock> => {
      const [safeToSpend, position] = await Promise.all([
        gateway.safeToSpend(token, code),
        gateway.position(token, code),
      ]);
      return { balance: withAccounts.find((b) => b.currency === code)!, safeToSpend, position };
    };

    if (selected === ALL_CURRENCIES) {
      return { ...base, single: null, all: await Promise.all(codes.map(block)) };
    }

    const [core, forecast, moneyFlow, budgets, rules, accounts] = await Promise.all([
      block(selected),
      optional(gateway.forecast(token, selected)),
      optional(gateway.moneyFlow(token, selected)),
      optional(gateway.budgets(token)),
      optional(recurringGateway().rules(token)),
      optional(transactionsGateway().accounts(token)),
    ]);
    return {
      ...base,
      all: null,
      single: {
        ...core,
        forecast,
        moneyFlow,
        budgets: budgets?.filter((b) => b.currency === selected) ?? null,
        due: rules
          ? dueRules(rules, selected, isoToday()).filter((r) => r.type === "expense")
          : null,
        setup: rules
          ? {
              hasIncome: rules.some((r) => r.type === "income"),
              hasExpenses: rules.some((r) => r.type === "expense"),
            }
          : null,
        accounts: accounts?.filter((a) => a.currency === selected && !a.archived_at) ?? null,
      },
    };
  }),
);

/** Un mes pasado del Map (BUG-040, como el BUG-025 de la app): lo que entró, salió y se ahorró. */
export interface PastMonthData {
  catalog: CurrencyCatalog;
  codes: string[];
  selected: string;
  hidden: boolean;
  privateMode: boolean;
  /** Null si la API no lo pudo dar. */
  position: Position | null;
}

/** Carga un mes pasado ("2026-09-01") en la moneda pedida, o en la principal. */
export const loadPastMonth = cache(
  async (requested: string | undefined, month: string): Promise<PastMonthData> =>
    withAccessToken(async (token) => {
      const gateway = mapGateway();
      const [currencies, balances, preferences] = await Promise.all([
        gateway.currencies(token),
        gateway.balances(token),
        optional(gateway.preferences(token)),
      ]);
      const hiddenAmounts = await amountsHidden(preferences);
      const catalog = new CurrencyCatalog(currencies);
      const withAccounts = balances.filter((b) => b.accounts > 0);
      const codes = catalog.order(withAccounts.map((b) => b.currency));
      const main = withAccounts.find((b) => b.is_main_currency)?.currency ?? codes[0] ?? "";
      const selected = requested && codes.includes(requested) ? requested : main;
      const position = selected
        ? await optional(gateway.position(token, selected, month.slice(0, 7)))
        : null;
      return {
        catalog,
        codes,
        selected,
        hidden: hiddenAmounts,
        privateMode: preferences?.hide_amounts ?? false,
        position,
      };
    }),
);
