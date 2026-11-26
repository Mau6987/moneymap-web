"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";

import { plansGateway } from "./data/plans-gateway";

export interface PlanChangeState {
  error?: string;
}

/**
 * MM-188: elige otro plan, al instante y sin cobro todavía. Vuelve a Planes
 * con el nombre del plan nuevo para el aviso.
 */
export async function changePlan(
  _previous: PlanChangeState,
  form: FormData,
): Promise<PlanChangeState> {
  const code = String(form.get("code") ?? "");
  if (!code) return { error: "validation_error" };
  let name: string;
  try {
    name = (await withAccessToken((token) => plansGateway().change(token, code))).name;
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/plans?changed=${encodeURIComponent(name)}`);
}
