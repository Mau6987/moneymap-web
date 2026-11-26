import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";
import { apiTextLocale } from "@/lib/i18n/server";
import { planName } from "@/lib/i18n/api-texts";

type Schemas = components["schemas"];
export type Plan = Schemas["PlanRead"];
export type PlanFeature = Schemas["FeatureRead"];
export type PlanPrice = Schemas["PriceRead"];
export type MyPlan = Schemas["MyPlanRead"];
export type MyFeature = Schemas["MyFeatureRead"];

/** Planes (spec 011 del back, RF-1 y RF-2). Lanza `ApiError`. */
export interface PlansGateway {
  /** Del gratuito al más alto, con sus precios y límites. */
  plans(token: string): Promise<Plan[]>;
  /** El plan propio y cuánto lleva usado. */
  mine(token: string): Promise<MyPlan>;
  /** MM-188: elige otro plan, al instante y sin cobro todavía. */
  change(token: string, code: string): Promise<MyPlan>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiPlansGateway: PlansGateway = {
  plans: (token) => unwrap(api(token).GET("/v1/plans")),
  mine: (token) => unwrap(api(token).GET("/v1/me/plan")),
  change: (token, code) => unwrap(api(token).PUT("/v1/me/plan", { body: { code } })),
};

const feature = (
  key: string,
  description: string,
  limit: number | null,
  period: string | null,
): PlanFeature => ({ key, description, enabled: true, limit, period });

/** Los límites de cada plan, como los dejan las migraciones 0011 y 0028 del back. */
const features = (limits: {
  cards: number | null;
  currencies: number | null;
  goals: number | null;
  budgets: number | null;
  voice: number | null;
  afford: number | null;
}): PlanFeature[] => [
  feature("finance.cards", "Tarjetas activas", limits.cards, "total"),
  feature(
    "finance.currencies",
    "Monedas distintas entre las cuentas activas",
    limits.currencies,
    "total",
  ),
  feature("goals.active", "Metas activas", limits.goals, "total"),
  feature("planning.budgets", "Presupuestos por categoría", limits.budgets, "total"),
  feature("ai.voice_entries", "Registros por voz al mes", limits.voice, "month"),
  feature(
    "planning.affordability_checks",
    "Consultas de Can I Afford It? al mes",
    limits.afford,
    "month",
  ),
  feature("notify.push", "Notificaciones push", null, null),
  feature("reports.money_story", "Monthly Money Story", null, null),
];

const price = (monthly: string, yearly: string, perMonth: string, pct: string): PlanPrice => ({
  currency: "BOB",
  monthly,
  yearly,
  yearly_per_month: perMonth,
  yearly_saving_pct: pct,
  purchasable: false,
});

const free = features({ cards: 1, currencies: 1, goals: null, budgets: 3, voice: 30, afford: 10 });

/** El plan que eligió la persona demo (MM-188); arranca en el gratuito. */
let demoPlan = "free";

const demoPlans = (): Plan[] => [
  { code: "free", name: "Gratuito", description: null, tier: 0, prices: [], features: free },
  {
    code: "paid_3",
    name: "Premium",
    description: "Todo sin límites.",
    tier: 3,
    prices: [price("79.00", "790.00", "65.83", "16.67")],
    features: features({
      cards: null,
      currencies: null,
      goals: null,
      budgets: null,
      voice: null,
      afford: null,
    }),
  },
];

function demoMine(): MyPlan {
  const plan = demoPlans().find((p) => p.code === demoPlan) ?? demoPlans()[0]!;
  return {
    code: plan.code,
    name: plan.name,
    tier: plan.tier,
    status: plan.tier === 0 ? "free" : "active",
    has_paid_access: plan.tier > 0,
    billing_period: plan.tier === 0 ? null : "month",
    current_period_end: null,
    auto_renew: plan.tier === 0 ? null : true,
    features: plan.features.map((f) => ({
      ...f,
      used:
        {
          "finance.cards": 1,
          "finance.currencies": 1,
          "goals.active": 1,
          "planning.budgets": 2,
          "ai.voice_entries": 4,
          "planning.affordability_checks": 3,
        }[f.key] ?? null,
    })),
  };
}

/** Los planes del back; la persona demo usa su única tarjeta. */
export const demoPlansGateway: PlansGateway = {
  plans: async () => demoPlans(),
  mine: async () => demoMine(),
  change: async (_token, code) => {
    if (!demoPlans().some((p) => p.code === code)) throw new ApiError("not_found", 404);
    demoPlan = code;
    return demoMine();
  },
};

export function plansGateway(): PlansGateway {
  const gateway = isDemo() ? demoPlansGateway : apiPlansGateway;
  // MM-191: los nombres con que nacen los planes se muestran en el idioma elegido.
  const named = async <T extends { code: string; name: string }>(found: Promise<T>) => {
    const [plan, locale] = await Promise.all([found, apiTextLocale()]);
    return { ...plan, name: planName(plan.code, plan.name, locale) };
  };
  return {
    ...gateway,
    plans: async (token) => {
      const [plans, locale] = await Promise.all([gateway.plans(token), apiTextLocale()]);
      return plans.map((p) => ({ ...p, name: planName(p.code, p.name, locale) }));
    },
    mine: (token) => named(gateway.mine(token)),
    change: (token, code) => named(gateway.change(token, code)),
  };
}
