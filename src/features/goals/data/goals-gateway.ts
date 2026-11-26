import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

import { demoMapGateway } from "../../map/data/demo-map-gateway";
import type { Goal } from "../../map/data/map-gateway";

/** Lo que "Nueva meta" y su edición mandan (spec 005, RF-1 y RF-4). */
export interface GoalDraft {
  name: string;
  target_amount: string;
  target_date: string | null;
  priority: number;
}

/** Las metas y sus aportes (spec 005, RF-1 a RF-9). Lanza `ApiError` con el `code`. */
export interface GoalsGateway {
  goals(token: string): Promise<Goal[]>;
  create(token: string, draft: GoalDraft & { currency: string }): Promise<Goal>;
  update(token: string, id: string, draft: GoalDraft): Promise<void>;
  remove(token: string, id: string): Promise<void>;
  /** Con `accountId` el dinero sale de esa cuenta: la cuenta baja y la meta sube. */
  contribute(
    token: string,
    id: string,
    amount: string,
    on: string,
    idempotencyKey: string,
    accountId?: string,
  ): Promise<void>;
  /** El dinero vuelve de la meta a la cuenta; no más de lo que tiene la meta. */
  withdraw(
    token: string,
    id: string,
    amount: string,
    on: string,
    idempotencyKey: string,
    accountId: string,
  ): Promise<void>;
}

const api = (accessToken: string) => createApiClient({ baseUrl: apiBaseUrl(), accessToken });
const path = (goal_id: string) => ({ params: { path: { goal_id } } });

export const apiGoalsGateway: GoalsGateway = {
  goals: (token) => unwrap(api(token).GET("/v1/goals")),
  create: (token, draft) => unwrap(api(token).POST("/v1/goals", { body: draft })),
  update: async (token, id, draft) => {
    await unwrap(api(token).PATCH("/v1/goals/{goal_id}", { ...path(id), body: draft }));
  },
  remove: async (token, id) => {
    await unwrap(api(token).DELETE("/v1/goals/{goal_id}", path(id)));
  },
  contribute: async (token, id, amount, on, idempotencyKey, accountId) => {
    await unwrap(
      api(token).POST("/v1/goals/{goal_id}/contributions", {
        params: { path: { goal_id: id }, header: { "Idempotency-Key": idempotencyKey } },
        body: { amount, contributed_on: on, ...(accountId ? { account_id: accountId } : {}) },
      }),
    );
  },
  withdraw: async (token, id, amount, on, idempotencyKey, accountId) => {
    await unwrap(
      api(token).POST("/v1/goals/{goal_id}/withdrawals", {
        params: { path: { goal_id: id }, header: { "Idempotency-Key": idempotencyKey } },
        body: { amount, account_id: accountId, withdrawn_on: on },
      }),
    );
  },
};

/** En el modo demo se leen las metas del Map. */
export const demoGoalsGateway: GoalsGateway = {
  goals: (token) => demoMapGateway.goals(token),
  create: async (_token, draft) => {
    return {
      id: "demo-new",
      ...draft,
      current_amount: "0.00",
      status: "active",
      progress_percent: 0,
      estimated_completion: null,
      suggested_contribution: null,
      period_type: "monthly",
    };
  },
  update: async () => {},
  remove: async () => {},
  contribute: async () => {},
  withdraw: async () => {},
};

export function goalsGateway(): GoalsGateway {
  return isDemo() ? demoGoalsGateway : apiGoalsGateway;
}
