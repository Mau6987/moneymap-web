import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

import { demoMapGateway } from "../../map/data/demo-map-gateway";
import type { MoneyFlow } from "../../map/data/map-gateway";
import { apiTextLocale } from "@/lib/i18n/server";
import { categoryName } from "@/lib/i18n/api-texts";

export type FlowGroup = "income" | "needs" | "lifestyle";
export type FlowCategories = components["schemas"]["FlowCategoriesRead"];

/** Money Flow de una moneda y un mes (spec 004, RF-6 a RF-13). Lanza `ApiError`. */
export interface MoneyFlowGateway {
  flow(token: string, currency: string, period?: string): Promise<MoneyFlow>;
  categories(
    token: string,
    currency: string,
    group: FlowGroup,
    period?: string,
  ): Promise<FlowCategories>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiMoneyFlowGateway: MoneyFlowGateway = {
  flow: (token, currency, period) =>
    unwrap(
      api(token).GET("/v1/reports/money-flow", {
        params: { query: { currency, ...(period ? { period } : {}) } },
      }),
    ),
  categories: (token, currency, group, period) =>
    unwrap(
      api(token).GET("/v1/reports/money-flow/categories", {
        params: { query: { currency, group, ...(period ? { period } : {}) } },
      }),
    ),
};

/** Las categorías demo de cada grupo, de mayor a menor. */
const demoItems: Record<string, Record<FlowGroup, [string, string][]>> = {
  BOB: {
    income: [["Salario", "12000.00"]],
    needs: [
      ["Vivienda", "2500.00"],
      ["Comida", "1000.00"],
      ["Transporte", "300.00"],
    ],
    lifestyle: [
      ["Ocio", "1500.00"],
      ["Suscripciones", "1000.00"],
    ],
  },
  USD: {
    income: [["Salario", "800.00"]],
    needs: [["Comida", "200.00"]],
    lifestyle: [["Suscripciones", "130.00"]],
  },
};

export const demoMoneyFlowGateway: MoneyFlowGateway = {
  flow: (token, currency) => demoMapGateway.moneyFlow(token, currency),
  categories: async (token, currency, group) => {
    const flow = await demoMapGateway.moneyFlow(token, currency);
    return {
      currency,
      period_starts_on: flow.period_starts_on,
      period_ends_on: flow.period_ends_on,
      group,
      items: (demoItems[currency]?.[group] ?? []).map(([name, amount], i) => ({
        category_id: `demo-${group}-${i}`,
        name,
        amount,
      })),
    };
  },
};

export function moneyFlowGateway(): MoneyFlowGateway {
  const gateway = isDemo() ? demoMoneyFlowGateway : apiMoneyFlowGateway;
  // MM-191: las categorías iniciales se muestran en el idioma elegido.
  return {
    ...gateway,
    categories: async (token, currency, group, period) => {
      const [found, locale] = await Promise.all([
        gateway.categories(token, currency, group, period),
        apiTextLocale(),
      ]);
      return {
        ...found,
        items: found.items.map((c) => ({ ...c, name: categoryName(c.name, locale) })),
      };
    },
  };
}
