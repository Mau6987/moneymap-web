import Decimal from "decimal.js";

import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { DEMO_NEW_USER_TOKEN, isDemo } from "@/lib/demo";
import { apiTextLocale } from "@/lib/i18n/server";
import { withCategoryNames } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type OnboardingStatus = Schemas["OnboardingStatusRead"];
export type OnboardingSummary = Schemas["OnboardingSummaryRead"];
export type Country = Schemas["CountryRead"];
export type Institution = Schemas["InstitutionRead"];
export type Currency = Schemas["CurrencyRead"];
export type Category = Schemas["CategoryRead"];
export type NewAccount = Schemas["AccountCreate"];
export type RecurringRule = Schemas["RecurringRuleRead"];
export type NewRule = Schemas["RecurringRuleCreate"];
export type PeriodType = "weekly" | "semi_monthly" | "monthly";

/**
 * Las llamadas del onboarding (spec 007), las mismas que hace la app. Lanza
 * `ApiError`. Ni las cuentas ni las reglas aceptan `Idempotency-Key`: los
 * pasos miran lo que ya está guardado antes de crear (RF-11).
 */
export interface OnboardingGateway {
  /** Qué pasos se guardaron (RF-10); `completed` cierra el onboarding (RF-1). */
  status(token: string): Promise<OnboardingStatus>;
  countries(token: string): Promise<Country[]>;
  institutions(token: string, country: string): Promise<Institution[]>;
  currencies(token: string): Promise<Currency[]>;
  /** Paso de moneda: también crea las categorías iniciales (RF-12). */
  saveMainCurrency(token: string, code: string): Promise<void>;
  savePeriod(token: string, period: PeriodType): Promise<void>;
  categories(token: string): Promise<Category[]>;
  /** La primera queda como cuenta por defecto (RF-3). */
  createAccount(token: string, account: NewAccount): Promise<void>;
  rules(token: string): Promise<RecurringRule[]>;
  /** Sin `account_id`, va a la cuenta por defecto. */
  createRule(token: string, rule: NewRule): Promise<void>;
  /** Idempotente: cierra el onboarding y devuelve el resumen del periodo (RF-7). */
  complete(token: string): Promise<OnboardingSummary>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiOnboardingGateway: OnboardingGateway = {
  status: (token) => unwrap(api(token).GET("/v1/onboarding")),
  countries: (token) => unwrap(api(token).GET("/v1/countries")),
  institutions: (token, country) =>
    unwrap(api(token).GET("/v1/institutions", { params: { query: { country } } })),
  currencies: (token) => unwrap(api(token).GET("/v1/currencies")),
  saveMainCurrency: async (token, code) => {
    await unwrap(api(token).PUT("/v1/me/settings", { body: { main_currency: code } }));
  },
  savePeriod: async (token, period) => {
    await unwrap(api(token).PUT("/v1/me/settings", { body: { period_type: period } }));
  },
  categories: (token) => unwrap(api(token).GET("/v1/categories")),
  createAccount: async (token, account) => {
    await unwrap(api(token).POST("/v1/accounts", { body: account }));
  },
  rules: (token) => unwrap(api(token).GET("/v1/recurring-rules")),
  createRule: async (token, rule) => {
    await unwrap(api(token).POST("/v1/recurring-rules", { body: rule }));
  },
  complete: (token) => unwrap(api(token).POST("/v1/onboarding/complete")),
};

const category = (
  template: string,
  name: string,
  type: "income" | "expense",
  color: string,
): Category => ({
  id: `c-${template}`,
  name,
  type,
  money_flow_group: type === "expense" ? "needs" : null,
  icon: "category",
  color,
  template_key: template,
});

/**
 * El modo demo: quien entra con el token de una persona nueva hace el
 * onboarding; lo que guarda queda en memoria mientras corre el servidor. El
 * resto ya lo terminó.
 */
const fresh = () => ({
  completed: false,
  mainCurrency: null as string | null,
  accounts: 0,
  rules: [] as RecurringRule[],
});
let demo = fresh();

const COUNTRIES: Country[] = [
  { code: "BO", name: "Bolivia", currency: "BOB" },
  { code: "AR", name: "Argentina", currency: "ARS" },
  { code: "PE", name: "Perú", currency: "PEN" },
  { code: "CL", name: "Chile", currency: "CLP" },
  { code: "PY", name: "Paraguay", currency: "PYG" },
  { code: "US", name: "Estados Unidos", currency: "USD" },
];

const BANKS: Record<string, [string, string, string][]> = {
  BO: [
    ["BUN", "Banco Unión", "bank"],
    ["BNB", "BNB", "bank"],
    ["BMSC", "Mercantil Santa Cruz", "bank"],
    ["BCP", "BCP", "bank"],
    ["BISA", "Banco Bisa", "bank"],
    ["TIGO", "Tigo Money", "wallet"],
  ],
  AR: [
    ["BNA", "Banco Nación", "bank"],
    ["GAL", "Galicia", "bank"],
    ["MP", "Mercado Pago", "wallet"],
  ],
  PE: [
    ["BCP", "BCP", "bank"],
    ["IBK", "Interbank", "bank"],
    ["YAPE", "Yape", "wallet"],
  ],
};

const CURRENCIES: [string, string, string, number][] = [
  ["BOB", "Boliviano", "Bs", 2],
  ["USD", "Dólar estadounidense", "$", 2],
  ["EUR", "Euro", "€", 2],
  ["ARS", "Peso argentino", "$", 2],
  ["PEN", "Sol peruano", "S/", 2],
  ["CLP", "Peso chileno", "$", 0],
  ["PYG", "Guaraní", "₲", 0],
];

const CATEGORIES: Category[] = [
  category("salary", "Salario", "income", "#2E8A62"),
  category("freelance", "Trabajo independiente", "income", "#0E7C86"),
  category("family_support", "Mesada familiar", "income", "#7C3AED"),
  category("other_income", "Otros ingresos", "income", "#6B7280"),
  category("housing", "Vivienda", "expense", "#3E4BD2"),
  category("utilities", "Servicios", "expense", "#E2A93C"),
  category("transport", "Transporte", "expense", "#2E8A62"),
  category("other_expense", "Otros gastos", "expense", "#6B7280"),
];

const isNew = (token: string) => token === DEMO_NEW_USER_TOKEN;
const total = (type: "income" | "expense") =>
  demo.rules.filter((r) => r.type === type).reduce((sum, r) => sum.plus(r.amount), new Decimal(0));

export const demoOnboardingGateway: OnboardingGateway = {
  status: async (token) =>
    isNew(token)
      ? {
          completed: demo.completed,
          completed_at: null,
          main_currency: demo.mainCurrency,
          accounts: demo.accounts,
          income_rules: demo.rules.filter((r) => r.type === "income").length,
          expense_rules: demo.rules.filter((r) => r.type === "expense").length,
        }
      : {
          completed: true,
          completed_at: "2026-10-01T12:00:00Z",
          main_currency: "BOB",
          accounts: 3,
          income_rules: 1,
          expense_rules: 2,
        },
  countries: async () => COUNTRIES,
  institutions: async (_, country) =>
    (BANKS[country] ?? []).map(([code, name, kind]) => ({ code, name, short_name: name, kind })),
  currencies: async () =>
    CURRENCIES.map(([code, name, symbol, decimals]) => ({
      code,
      name,
      symbol,
      decimals,
      is_active: true,
      is_mine: code === demo.mainCurrency,
      is_main_currency: code === demo.mainCurrency,
    })),
  saveMainCurrency: async (_, code) => {
    if (!CURRENCIES.some(([c]) => c === code)) throw new ApiError("currency_unavailable", 422);
    if (demo.completed) demo = fresh();
    demo.mainCurrency = code;
  },
  savePeriod: async () => {},
  categories: async () => CATEGORIES,
  createAccount: async (_, account) => {
    if (account.name.trim().length === 0) throw new ApiError("validation_error", 422);
    demo.accounts += 1;
  },
  rules: async () => demo.rules.map((r) => ({ ...r })),
  createRule: async (_, rule) => {
    const found = CATEGORIES.find((c) => c.id === rule.category_id);
    if (!found) throw new ApiError("not_found", 404);
    demo.rules.push({
      id: `r${demo.rules.length + 1}`,
      account_id: "demo-cash",
      category_id: rule.category_id,
      type: found.type,
      amount: String(rule.amount),
      currency: demo.mainCurrency ?? "BOB",
      description: rule.description,
      frequency: rule.frequency,
      next_due_on: "2026-11-01",
      auto_post: rule.auto_post,
      pending_dates: ["2026-11-01"],
    });
  },
  complete: async () => {
    if (demo.accounts === 0) throw new ApiError("onboarding_incomplete", 422);
    demo.completed = true;
    const income = total("income");
    const committed = total("expense");
    const balance = new Decimal("2500");
    return {
      currency: demo.mainCurrency ?? "BOB",
      period_starts_on: "2026-10-01",
      period_ends_on: "2026-10-31",
      income: income.toFixed(2),
      committed: committed.toFixed(2),
      balance: balance.toFixed(2),
      planned_savings: "0.00",
      goal_contributions: "0.00",
      safe_to_spend: balance.plus(income).minus(committed).toFixed(2),
    };
  },
};

export function onboardingGateway(): OnboardingGateway {
  const gateway = isDemo() ? demoOnboardingGateway : apiOnboardingGateway;
  // MM-191: las categorías iniciales se muestran en el idioma elegido.
  return {
    ...gateway,
    categories: async (token) =>
      withCategoryNames(await gateway.categories(token), await apiTextLocale()),
  };
}
