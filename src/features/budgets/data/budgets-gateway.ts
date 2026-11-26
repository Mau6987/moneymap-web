import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

import { demoMapGateway } from "../../map/data/demo-map-gateway";
import type { Budget } from "../../map/data/map-gateway";
import { apiTextLocale } from "@/lib/i18n/server";
import { categoryName } from "@/lib/i18n/api-texts";

export interface NewBudget {
  category_id: string;
  amount: string;
  currency: string;
  alert_at_80: boolean;
  alert_at_100: boolean;
}

export interface BudgetChange {
  amount: string;
  alert_at_80: boolean;
  alert_at_100: boolean;
}

/** Los presupuestos por categoría (spec 009 del back, RF-1 a RF-11). Lanza `ApiError`. */
export interface BudgetsGateway {
  budgets(token: string): Promise<Budget[]>;
  create(token: string, budget: NewBudget): Promise<Budget>;
  update(token: string, id: string, change: BudgetChange): Promise<void>;
  remove(token: string, id: string): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });
const path = (budget_id: string) => ({ params: { path: { budget_id } } });

export const apiBudgetsGateway: BudgetsGateway = {
  budgets: (token) => unwrap(api(token).GET("/v1/budgets")),
  create: (token, budget) => unwrap(api(token).POST("/v1/budgets", { body: budget })),
  update: async (token, id, change) => {
    await unwrap(api(token).PATCH("/v1/budgets/{budget_id}", { ...path(id), body: change }));
  },
  remove: async (token, id) => {
    await unwrap(api(token).DELETE("/v1/budgets/{budget_id}", path(id)));
  },
};

/** En el modo demo: 3 presupuestos en el plan gratuito y uno por categoría y moneda. */
export const demoBudgetsGateway: BudgetsGateway = {
  budgets: async (token) => {
    const budgets = await demoMapGateway.budgets(token);
    const [first, ...rest] = budgets;
    if (!first) return budgets;
    // El gasto del mes, día por día, para el gráfico del detalle.
    const start = first.period_starts_on;
    const day = (n: number) => {
      const d = new Date(`${start}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const daily = [
      [0, "300.00", "300.00"],
      [4, "250.00", "550.00"],
      [9, "400.00", "950.00"],
      [14, "250.00", "1200.00"],
    ].map(([n, spent, cumulative]) => ({
      on: day(n as number),
      spent: spent as string,
      cumulative: cumulative as string,
    }));
    return [{ ...first, daily, pace: { ...first.pace, projected_total: "2480.00" } }, ...rest];
  },
  create: async (token, budget) => {
    const budgets = await demoMapGateway.budgets(token);
    if (budgets.length >= 3) throw new ApiError("plan_limit", 409);
    if (
      budgets.some((b) => b.category_id === budget.category_id && b.currency === budget.currency)
    ) {
      throw new ApiError("budget_exists", 409);
    }
    return { ...budgets[0]!, ...budget, id: "demo-new", spent: "0.00", remaining: budget.amount };
  },
  update: async () => {},
  remove: async () => {},
};

export function budgetsGateway(): BudgetsGateway {
  const gateway = isDemo() ? demoBudgetsGateway : apiBudgetsGateway;
  // MM-191: las categorías iniciales se muestran en el idioma elegido.
  return {
    ...gateway,
    budgets: async (token) => {
      const [budgets, locale] = await Promise.all([gateway.budgets(token), apiTextLocale()]);
      return budgets.map((b) => ({ ...b, category_name: categoryName(b.category_name, locale) }));
    },
  };
}
