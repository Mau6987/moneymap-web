import { unstable_rethrow } from "next/navigation";

import { withAccessToken } from "@/lib/auth/session";

import { plansGateway, type MyFeature } from "./data/plans-gateway";

/** Lo que muestra la tarjeta de límite: la funcionalidad y cuánto lleva. */
export interface PlanLimit {
  key: string;
  description: string;
  used: number;
  limit: number;
}

/** True si ya no le queda (MM-188): con límite y lo usado lo alcanza. */
export function isFull(feature: MyFeature | undefined): boolean {
  return (
    !!feature && feature.limit !== null && feature.used !== null && feature.used >= feature.limit
  );
}

export function asLimit(feature: MyFeature, used = feature.used ?? 0): PlanLimit {
  return { key: feature.key, description: feature.description, used, limit: feature.limit ?? 0 };
}

/**
 * Las funcionalidades del plan propio con lo usado (MM-188). Si la API falla,
 * `null`: la pantalla sigue, porque la API igual responde `plan_limit`.
 */
export async function myPlanFeatures(): Promise<Map<string, MyFeature> | null> {
  try {
    const mine = await withAccessToken((token) => plansGateway().mine(token));
    return new Map(mine.features.map((f) => [f.key, f]));
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** La funcionalidad `key` si ya llegó a su límite; si no, `null`. */
export async function reachedLimit(key: string): Promise<PlanLimit | null> {
  const feature = (await myPlanFeatures())?.get(key);
  return feature && isFull(feature) ? asLimit(feature) : null;
}
