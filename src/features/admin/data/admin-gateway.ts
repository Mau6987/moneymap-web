import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { ApiError, unwrap } from "@/lib/api/errors";
import type { components } from "@/lib/api/generated/schema";
import { isDemo } from "@/lib/demo";

type Schemas = components["schemas"];
export type AdminPlan = Schemas["AdminPlanRead"];
export type AdminFeature = Schemas["AdminFeatureRead"];
export type AdminChange = Schemas["AdminChangeRead"];
export type PricePeriod = "month" | "year";

/** El panel de planes (spec 013 del back, MM-190). Lanza `ApiError`. */
export interface AdminGateway {
  plans(token: string): Promise<AdminPlan[]>;
  updatePlan(
    token: string,
    code: string,
    body: { name: string; description: string | null; is_public: boolean },
  ): Promise<void>;
  setFeature(
    token: string,
    code: string,
    key: string,
    body: { enabled: boolean; limit: number | null },
  ): Promise<void>;
  setPrice(
    token: string,
    code: string,
    period: PricePeriod,
    currency: string,
    amount: string,
  ): Promise<void>;
  changes(token: string, limit: number): Promise<AdminChange[]>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });

export const apiAdminGateway: AdminGateway = {
  plans: (token) => unwrap(api(token).GET("/v1/admin/plans")),
  updatePlan: async (token, code, body) => {
    await unwrap(api(token).PATCH("/v1/admin/plans/{code}", { params: { path: { code } }, body }));
  },
  setFeature: async (token, code, key, body) => {
    await unwrap(
      api(token).PUT("/v1/admin/plans/{code}/features/{key}", {
        params: { path: { code, key } },
        body,
      }),
    );
  },
  setPrice: async (token, code, period, currency, amount) => {
    await unwrap(
      api(token).PUT("/v1/admin/plans/{code}/prices/{period}/{currency}", {
        params: { path: { code, period, currency } },
        body: { amount },
      }),
    );
  },
  changes: (token, limit) =>
    unwrap(api(token).GET("/v1/admin/plan-changes", { params: { query: { limit } } })),
};

const feature = (
  key: string,
  description: string,
  kind: "limit" | "boolean",
  period: string | null,
  limit: number | null,
): AdminFeature => ({ key, description, kind, period, enabled: true, limit });

/** Límites en el orden de la tabla: voz, tarjetas, monedas, metas, consultas, presupuestos. */
const features = (l: readonly (number | null)[]): AdminFeature[] => [
  feature("ai.voice_entries", "Registros por voz al mes", "limit", "month", l[0] ?? null),
  feature("finance.cards", "Tarjetas activas", "limit", "total", l[1] ?? null),
  feature(
    "finance.currencies",
    "Monedas distintas entre las cuentas activas",
    "limit",
    "total",
    l[2] ?? null,
  ),
  feature("goals.active", "Metas activas", "limit", "total", l[3] ?? null),
  feature("notify.push", "Notificaciones push", "boolean", null, null),
  feature(
    "planning.affordability_checks",
    "Consultas de Can I Afford It? al mes",
    "limit",
    "month",
    l[4] ?? null,
  ),
  feature("planning.budgets", "Presupuestos por categoría", "limit", "total", l[5] ?? null),
  feature("reports.money_story", "Monthly Money Story", "boolean", null, null),
];

const prices = (month: string, year: string): AdminPlan["prices"] => [
  { period: "month", currency: "BOB", amount: month },
  { period: "year", currency: "BOB", amount: year },
];

/** Los planes vigentes del back, en memoria para la persona demo. */
const demoPlans: AdminPlan[] = [
  {
    code: "free",
    name: "Gratuito",
    description: null,
    tier: 0,
    is_public: true,
    subscribers: 1,
    prices: [],
    features: features([30, 1, 1, null, 10, 3]),
  },
  {
    code: "paid_3",
    name: "Premium",
    description: "Todo sin límites.",
    tier: 3,
    is_public: true,
    subscribers: 0,
    prices: prices("79.00", "790.00"),
    features: features([null, null, null, null, null, null]),
  },
];
const demoChanges: AdminChange[] = [];

function demoPlan(code: string): AdminPlan {
  const plan = demoPlans.find((p) => p.code === code);
  if (!plan) throw new ApiError("not_found", 404);
  return plan;
}

function logDemo(entity: string, action: string, changes: Record<string, unknown>) {
  demoChanges.unshift({ occurred_at: new Date().toISOString(), entity, action, changes });
}

export const demoAdminGateway: AdminGateway = {
  plans: async () => structuredClone(demoPlans),
  updatePlan: async (_token, code, body) => {
    const plan = demoPlan(code);
    if (plan.tier === 0 && !body.is_public) throw new ApiError("free_plan_required", 409);
    logDemo("billing.plans", "update", { name: [plan.name, body.name] });
    Object.assign(plan, body);
  },
  setFeature: async (_token, code, key, body) => {
    const f = demoPlan(code).features.find((x) => x.key === key);
    if (!f) throw new ApiError("not_found", 404);
    if (f.kind === "boolean" && body.limit !== null) throw new ApiError("invalid_limit", 422);
    logDemo("billing.plan_features", "update", { limit_value: [f.limit, body.limit] });
    Object.assign(f, body);
  },
  setPrice: async (_token, code, period, currency, amount) => {
    const plan = demoPlan(code);
    if (plan.tier === 0) throw new ApiError("free_plan_required", 409);
    plan.prices = [
      ...plan.prices.filter((p) => !(p.period === period && p.currency === currency)),
      { period, currency, amount },
    ];
    logDemo("billing.plan_prices", "insert", { amount });
  },
  changes: async (_token, limit) => demoChanges.slice(0, limit),
};

export function adminGateway(): AdminGateway {
  return isDemo() ? demoAdminGateway : apiAdminGateway;
}
