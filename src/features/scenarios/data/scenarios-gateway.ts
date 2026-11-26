import Decimal from "decimal.js";

import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";
import { categoryName } from "@/lib/i18n/api-texts";
import { apiTextLocale } from "@/lib/i18n/server";

type Schemas = components["schemas"];
export type Affordability = Schemas["AffordabilityRead"];
export type WhatIfBase = Schemas["WhatIfBaseRead"];
export type PeriodType = WhatIfBase["period_type"];

/** De qué periodo, moneda y cuenta (efectivo o una tarjeta) se simula. Sin cuenta, todas. */
export interface BaseQuery {
  currency: string;
  period_type: PeriodType;
  account_id: string | null;
}

/**
 * Can I Afford It? (spec 005, RF-10 a RF-18) y la base del simulador de What If?
 * (spec 009 del back, RF-20 a RF-23). Ninguna de las dos guarda nada. Lanza `ApiError`.
 */
export interface ScenariosGateway {
  afford(
    token: string,
    check: { amount: string; currency: string; category_id: string | null },
  ): Promise<Affordability>;
  /** Ingresos y gastos por categoría del periodo y el aporte a cada meta: los sliders parten de acá. */
  baseline(token: string, query: BaseQuery): Promise<WhatIfBase>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiScenariosGateway: ScenariosGateway = {
  afford: (token, check) => unwrap(api(token).POST("/v1/affordability-checks", { body: check })),
  baseline: (token, { currency, period_type, account_id }) =>
    unwrap(
      api(token).GET("/v1/what-if/baseline", {
        params: { query: { currency, period_type, ...(account_id ? { account_id } : {}) } },
      }),
    ),
};

const PERIODS_PER_YEAR: Record<PeriodType, number> = { weekly: 52, semi_monthly: 24, monthly: 12 };

interface DemoAfford {
  safe: string;
  balance: string;
  pending: string;
  income: string;
  variable: string;
  goals: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  monthlyGoals: string;
  surplus: string;
}

const DEMO_AFFORD: Record<string, DemoAfford> = {
  BOB: {
    safe: "4200.00",
    balance: "6000.00",
    pending: "1500.00",
    income: "3000.00",
    variable: "340.00",
    goals: "300.00",
    monthlyIncome: "3000.00",
    monthlyExpenses: "1300.00",
    monthlyGoals: "500.00",
    surplus: "1200.00",
  },
  USD: {
    safe: "350.00",
    balance: "350.00",
    pending: "0.00",
    income: "0.00",
    variable: "0.00",
    goals: "0.00",
    monthlyIncome: "0.00",
    monthlyExpenses: "350.00",
    monthlyGoals: "0.00",
    surplus: "0.00",
  },
};
const period = () => {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    period_starts_on: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    period_ends_on: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

/** Solo para el demo: el periodo de ese tipo que contiene hoy (la API lo calcula con la base). */
const demoPeriod = (type: PeriodType) => {
  const now = new Date();
  const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (type === "weekly") {
    const monday = new Date(y, m, d - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { period_starts_on: iso(monday), period_ends_on: iso(sunday) };
  }
  if (type === "semi_monthly") {
    return d <= 15
      ? { period_starts_on: iso(new Date(y, m, 1)), period_ends_on: iso(new Date(y, m, 15)) }
      : { period_starts_on: iso(new Date(y, m, 16)), period_ends_on: iso(new Date(y, m + 1, 0)) };
  }
  return period();
};

/** Respuestas falsas con las dos salidas de Can I Afford It? y una base del simulador. */
export const demoScenariosGateway: ScenariosGateway = {
  // Los números del demo de la app: Safe to Spend de Bs 4.200, Bs 3.000 de
  // ingresos que faltan y Bs 340 de gasto variable (Bs 6.860 disponibles). Con
  // Bs 1.200 de sobrante al mes, es un mes por cada Bs 1.200 que falten.
  afford: async (_, { amount, currency }) => {
    const figures = DEMO_AFFORD[currency] ?? DEMO_AFFORD.USD;
    const d = (key: keyof DemoAfford) => new Decimal(figures?.[key] ?? "0");
    const text = (value: Decimal) => value.toFixed(2);
    const price = new Decimal(amount);
    const available = d("safe").plus(d("income")).minus(d("variable"));
    const missing = price.minus(available);
    const affordable = missing.lte(0);
    const surplus = d("surplus");
    const months = !affordable && surplus.gt(0) ? missing.div(surplus).ceil().toNumber() : 0;
    const monthOn = (n: number) => {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth() + n, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    };
    const projection = months
      ? [
          { on: period().period_starts_on, balance: text(available) },
          ...Array.from({ length: months }, (_, i) => {
            const balance = available.plus(surplus.times(i + 1));
            // Como la API: solo el último punto se cierra en el precio.
            return {
              on: monthOn(i + 1),
              balance: text(i === months - 1 ? Decimal.max(balance, price) : balance),
            };
          }),
        ]
      : [];
    const fromGoals = Decimal.min(missing, d("goals"));
    return {
      verdict: affordable ? "affordable" : "not_yet",
      currency,
      amount: text(price),
      safe_to_spend: text(d("safe")),
      breakdown: {
        current_balance: text(d("balance")),
        pending_recurring: text(d("pending")),
        planned_savings: "0.00",
        goal_contributions: text(d("goals")),
      },
      income_in_period: text(d("income")),
      remaining_variable_spending: text(d("variable")),
      available: text(available),
      available_after: text(missing.neg()),
      goal_impacts:
        !affordable && fromGoals.gt(0)
          ? [
              {
                goal_id: "g1",
                name: "Fondo de emergencia",
                amount: text(fromGoals),
                delay_months: 1,
              },
            ]
          : [],
      estimated_on: months ? monthOn(months) : null,
      projection,
      assumptions: {
        ...period(),
        monthly_income: text(d("monthlyIncome")),
        monthly_expenses: text(d("monthlyExpenses")),
        monthly_goals: text(d("monthlyGoals")),
        monthly_planned_savings: "0.00",
        monthly_surplus: text(surplus),
        limited_history: false,
      },
    };
  },
  baseline: async (_, { currency, period_type, account_id }) => {
    const perYear = PERIODS_PER_YEAR[period_type];
    // Los montos demo son de un mes; una cuenta sola mueve la mitad.
    const scale = new Decimal(12).div(perYear).times(account_id ? "0.5" : 1);
    const amount = (monthly: string) => new Decimal(monthly).times(scale).toFixed(2);
    const items = (group: "income" | "needs" | "lifestyle", rows: [string, string][]) =>
      rows.map(([name, monthly]) => ({
        category_id: `demo-${group}-${name.toLowerCase()}`,
        name,
        group,
        amount: amount(monthly),
      }));
    const usd = currency === "USD";
    return {
      currency,
      period_type,
      periods_per_year: perYear,
      ...demoPeriod(period_type),
      account_id,
      income: usd
        ? items("income", [["Salario", "800.00"]])
        : items("income", [
            ["Salario", "12000.00"],
            ["Ventas", "1500.00"],
            ["Intereses", "300.00"],
            ["Regalos", "200.00"],
          ]),
      expenses: usd
        ? items("needs", [["Comida", "200.00"]])
        : [
            ...items("needs", [["Vivienda", "2500.00"]]),
            ...items("lifestyle", [["Ocio", "1500.00"]]),
            ...items("needs", [
              ["Comida", "1000.00"],
              ["Transporte", "300.00"],
            ]),
            ...items("lifestyle", [["Suscripciones", "250.00"]]),
          ],
      goals: usd
        ? []
        : [
            {
              goal_id: "g1",
              name: "Fondo de emergencia",
              target_amount: "10000.00",
              current_amount: "2500.00",
              monthly_contribution: "500.00",
              period_contribution: new Decimal(500).times(12).div(perYear).toFixed(2),
            },
          ],
    };
  },
};

export function scenariosGateway(): ScenariosGateway {
  const gateway = isDemo() ? demoScenariosGateway : apiScenariosGateway;
  // MM-191: las categorías iniciales se muestran en el idioma elegido.
  return {
    ...gateway,
    baseline: async (token, query) => {
      const [base, locale] = await Promise.all([gateway.baseline(token, query), apiTextLocale()]);
      const named = (items: WhatIfBase["income"]) =>
        items.map((c) => ({ ...c, name: categoryName(c.name, locale) }));
      return { ...base, income: named(base.income), expenses: named(base.expenses) };
    },
  };
}
