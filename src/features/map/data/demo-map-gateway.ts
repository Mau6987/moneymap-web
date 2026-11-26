import Decimal from "decimal.js";

import { ApiError } from "@/lib/api/errors";

import type { Budget, Currency, Goal, MapGateway, Transaction } from "./map-gateway";

/**
 * Datos falsos del Map para `DEMO=true`, los mismos de la app: el caso del
 * PRD §6.10 en bolivianos y una parte en dólares. El periodo es el mes en curso.
 */
const day = (date: Date) => date.toISOString().slice(0, 10);
const today = () => new Date();
const monthStart = () => new Date(today().getFullYear(), today().getMonth(), 1);
const monthEnd = () => new Date(today().getFullYear(), today().getMonth() + 1, 0);
const inDays = (days: number) => new Date(today().getTime() + days * 86_400_000);

const currencies: Currency[] = [
  {
    code: "BOB",
    name: "Boliviano",
    symbol: "Bs",
    decimals: 2,
    is_active: true,
    is_mine: true,
    is_main_currency: true,
  },
  {
    code: "USD",
    name: "Dólar estadounidense",
    symbol: "$",
    decimals: 2,
    is_active: true,
    is_mine: true,
    is_main_currency: false,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimals: 2,
    is_active: true,
    is_mine: false,
    is_main_currency: false,
  },
];

/** Saldo, ingresos, gastos, ahorrado y los cuatro conceptos de Safe to Spend. */
const figures = {
  BOB: {
    total: "4250.00",
    cash: "900.00",
    card: "3350.00",
    accounts: 2,
    income: "12000.00",
    expenses: "6300.00",
    saved: "1500.00",
    sts: {
      amount: "1000.00",
      balance: "2500.00",
      recurring: "700.00",
      savings: "500.00",
      goals: "300.00",
    },
    flow: { needs: "3800.00", lifestyle: "2500.00", goals: "1500.00", available: "4200.00" },
  },
  USD: {
    total: "300.00",
    cash: "0.00",
    card: "300.00",
    accounts: 1,
    income: "800.00",
    expenses: "330.00",
    saved: "120.00",
    sts: {
      amount: "350.00",
      balance: "500.00",
      recurring: "30.00",
      savings: "0.00",
      goals: "120.00",
    },
    flow: { needs: "200.00", lifestyle: "130.00", goals: "120.00", available: "350.00" },
  },
} as const;

type Code = keyof typeof figures;
const of = (currency: string) => {
  const f = figures[currency as Code];
  if (!f) throw new ApiError("not_found", 404);
  return f;
};

const goals: Goal[] = [
  {
    id: "g1",
    name: "Fondo de emergencia",
    target_amount: "5000.00",
    current_amount: "2500.00",
    currency: "BOB",
    target_date: day(inDays(240)),
    priority: 1,
    status: "active",
    progress_percent: 50,
    estimated_completion: day(inDays(240)),
    suggested_contribution: "157.00",
    period_type: "semi_monthly",
  },
  {
    id: "g2",
    name: "Laptop nueva",
    target_amount: "1200.00",
    current_amount: "450.00",
    currency: "USD",
    target_date: null,
    priority: 3,
    status: "active",
    progress_percent: 37,
    estimated_completion: day(inDays(180)),
    suggested_contribution: null,
    period_type: "semi_monthly",
  },
];

const budget = (
  id: string,
  category: string,
  name: string,
  amount: string,
  spent: string,
  remaining: string,
  percent: number,
  pace: "on_track" | "a_bit_fast" | "too_fast",
): Budget => ({
  id,
  category_id: category,
  category_name: name,
  currency: "BOB",
  amount,
  spent,
  remaining,
  percent_used: percent,
  pace: { status: pace, projected_total: amount },
  period_starts_on: day(monthStart()),
  period_ends_on: day(monthEnd()),
  daily: [],
  alert_at_80: true,
  alert_at_100: true,
});

const transactions: Transaction[] = [
  ["t1", "expense", "c-food", "186.00", "BOB", "Hipermaxi"],
  ["t2", "income", "c-salary", "8000.00", "BOB", "Sueldo"],
  ["t3", "expense", "c-subs", "15.00", "USD", "Netflix"],
  ["t4", "expense", "c-transport", "35.00", "BOB", "Taxi"],
].map(([id, kind, category, amount, currency, description], i) => ({
  id: id!,
  kind: kind!,
  account_id: currency === "USD" ? "demo-usd" : "demo-cash",
  category_id: category!,
  transfer_account_id: null,
  amount: amount!,
  currency: currency!,
  occurred_on: day(inDays(-i)),
  description: description!,
  source: "quick_add",
  created_at: inDays(-i).toISOString(),
  has_receipt: false,
}));

export const demoMapGateway: MapGateway = {
  currencies: async () => currencies,
  balances: async () =>
    (Object.keys(figures) as Code[]).map((code) => ({
      currency: code,
      is_main_currency: code === "BOB",
      total: figures[code].total,
      cash_total: figures[code].cash,
      card_total: figures[code].card,
      accounts: figures[code].accounts,
    })),
  safeToSpend: async (_, currency = "BOB") => {
    const { sts } = of(currency);
    return {
      currency,
      period_starts_on: day(monthStart()),
      period_ends_on: day(monthEnd()),
      amount: sts.amount,
      breakdown: {
        current_balance: sts.balance,
        pending_recurring: sts.recurring,
        planned_savings: sts.savings,
        goal_contributions: sts.goals,
      },
    };
  },
  position: async (_, currency) => {
    const f = of(currency);
    return {
      currency,
      period_starts_on: day(monthStart()),
      period_ends_on: day(monthEnd()),
      available_balance: f.total,
      income: f.income,
      expenses: f.expenses,
      saved: f.saved,
    };
  },
  forecast: async (_, currency) => {
    const f = of(currency);
    return {
      currency,
      balance: f.total,
      points: ([30, 60, 90] as const).map((days, i) => ({
        days,
        on: day(inDays(days)),
        balance: new Decimal(f.total)
          .times(new Decimal(1).plus(new Decimal(i + 1).div(10)))
          .toFixed(2),
        recurring_income: f.income,
        recurring_expenses: f.sts.recurring,
        goal_contributions: f.sts.goals,
        variable_spending: f.expenses,
      })),
      goes_negative_on: null,
      limited_history: false,
      assumptions: {
        recurring_income: f.income,
        recurring_expenses: f.sts.recurring,
        goal_contributions: f.sts.goals,
        variable_spending: f.expenses,
        history_months: 3,
      },
    };
  },
  moneyFlow: async (_, currency) => {
    const f = of(currency);
    return {
      currency,
      period_starts_on: day(monthStart()),
      period_ends_on: day(monthEnd()),
      nodes: { income: f.income, ...f.flow },
    };
  },
  budgets: async () => [
    budget("b1", "c-food", "Comida", "2000.00", "1200.00", "800.00", 60, "too_fast"),
    budget("b2", "c-transport", "Transporte", "800.00", "256.00", "544.00", 32, "on_track"),
  ],
  recentTransactions: async (_, currency, limit) =>
    transactions.filter((t) => t.currency === currency).slice(0, limit),
  goals: async () => goals,
  categories: async () => [
    {
      id: "c-food",
      name: "Comida",
      type: "expense",
      money_flow_group: "needs",
      icon: "restaurant",
      color: "#D25A42",
      template_key: null,
    },
    {
      id: "c-transport",
      name: "Transporte",
      type: "expense",
      money_flow_group: "needs",
      icon: "directions_bus",
      color: "#2E8A62",
      template_key: null,
    },
    {
      id: "c-subs",
      name: "Suscripciones",
      type: "expense",
      money_flow_group: "lifestyle",
      icon: "subscriptions",
      color: "#7C3AED",
      template_key: null,
    },
    {
      id: "c-salary",
      name: "Salario",
      type: "income",
      money_flow_group: null,
      icon: "payments",
      color: "#2E8A62",
      template_key: null,
    },
  ],
  preferences: async () => ({
    theme: "system",
    accent_color: "#3E4BD2",
    hide_amounts: false,
    week_starts_on: 1,
  }),
};
