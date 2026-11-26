import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

import { demoMapGateway } from "./demo-map-gateway";
import { apiTextLocale } from "@/lib/i18n/server";
import { withCategoryNames } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type Balance = Schemas["BalanceTotalRead"];
export type SafeToSpend = Schemas["SafeToSpendRead"];
export type Position = Schemas["PositionRead"];
export type Forecast = Schemas["ForecastRead"];
export type MoneyFlow = Schemas["MoneyFlowRead"];
export type Budget = Schemas["BudgetRead"];
export type Transaction = Schemas["TransactionItemRead"];
export type Goal = Schemas["GoalRead"];
export type Category = Schemas["CategoryRead"];
export type Preferences = Schemas["PreferencesRead"];
export type Currency = Schemas["CurrencyRead"];

/**
 * Lo que el Map le pide a la API (specs 003 y 004). Cada lectura es de una
 * sola moneda: la API nunca suma monedas y la web tampoco. Lanza `ApiError`.
 */
export interface MapGateway {
  currencies(token: string): Promise<Currency[]>;
  balances(token: string): Promise<Balance[]>;
  /** Sin moneda, la principal (la API la elige). */
  safeToSpend(token: string, currency?: string): Promise<SafeToSpend>;
  /** El periodo de hoy o, con `period` ("2026-09"), ese mes (BUG-040). */
  position(token: string, currency: string, period?: string): Promise<Position>;
  forecast(token: string, currency: string): Promise<Forecast>;
  moneyFlow(token: string, currency: string): Promise<MoneyFlow>;
  budgets(token: string): Promise<Budget[]>;
  recentTransactions(token: string, currency: string, limit: number): Promise<Transaction[]>;
  goals(token: string): Promise<Goal[]>;
  categories(token: string): Promise<Category[]>;
  preferences(token: string): Promise<Preferences>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiMapGateway: MapGateway = {
  currencies: (token) => unwrap(api(token).GET("/v1/currencies")),
  balances: (token) => unwrap(api(token).GET("/v1/balances")),
  safeToSpend: (token, currency) =>
    unwrap(
      api(token).GET("/v1/safe-to-spend", { params: { query: currency ? { currency } : {} } }),
    ),
  position: (token, currency, period) =>
    unwrap(
      api(token).GET("/v1/reports/position", {
        params: { query: period ? { currency, period } : { currency } },
      }),
    ),
  forecast: (token, currency) =>
    unwrap(api(token).GET("/v1/forecast", { params: { query: { currency } } })),
  moneyFlow: (token, currency) =>
    unwrap(api(token).GET("/v1/reports/money-flow", { params: { query: { currency } } })),
  budgets: (token) => unwrap(api(token).GET("/v1/budgets")),
  recentTransactions: async (token, currency, limit) =>
    (await unwrap(api(token).GET("/v1/transactions", { params: { query: { currency, limit } } })))
      .items,
  goals: (token) => unwrap(api(token).GET("/v1/goals")),
  categories: (token) => unwrap(api(token).GET("/v1/categories")),
  preferences: (token) => unwrap(api(token).GET("/v1/me/preferences")),
};

export function mapGateway(): MapGateway {
  const gateway = isDemo() ? demoMapGateway : apiMapGateway;
  // MM-191: las categorías iniciales llegan en español; se muestran en el idioma elegido.
  return {
    ...gateway,
    categories: async (token) =>
      withCategoryNames(await gateway.categories(token), await apiTextLocale()),
  };
}
