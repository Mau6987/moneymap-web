"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import { adminGateway } from "./data/admin-gateway";

export interface AdminFormState {
  error?: string;
}

const PLAN_CODE = /^[a-z0-9_]+$/;

async function run(
  code: string,
  saved: string,
  call: (token: string) => Promise<void>,
): Promise<AdminFormState> {
  try {
    await withAccessToken(call);
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  revalidatePath("/admin");
  redirect(`/admin/plans/${code}?saved=${saved}`);
}

/** Nombre, descripción y si se muestra en Planes (spec 013 del back, RF-3). */
export async function updatePlan(
  _previous: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!PLAN_CODE.test(code) || !name || name.length > 60 || description.length > 200) {
    return { error: "validation_error" };
  }
  return run(code, "details", (token) =>
    adminGateway().updatePlan(token, code, {
      name,
      description: description || null,
      is_public: form.get("is_public") === "on",
    }),
  );
}

/** Si el plan tiene la funcionalidad y con qué límite; vacío = sin límite (RF-4). */
export async function setFeature(
  _previous: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const code = String(form.get("code") ?? "");
  const key = String(form.get("key") ?? "");
  const raw = String(form.get("limit") ?? "").trim();
  const limit = raw === "" ? null : Number(raw);
  if (!PLAN_CODE.test(code) || !key) return { error: "validation_error" };
  if (limit !== null && (!Number.isInteger(limit) || limit < 0)) return { error: "invalid_limit" };
  return run(code, "feature", (token) =>
    adminGateway().setFeature(token, code, key, { enabled: form.get("enabled") === "on", limit }),
  );
}

/** El precio mensual o anual en una moneda; el anterior se cierra (RF-5). */
export async function setPrice(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  const code = String(form.get("code") ?? "");
  const period = String(form.get("period") ?? "");
  const currency = String(form.get("currency") ?? "");
  if (!PLAN_CODE.test(code) || (period !== "month" && period !== "year")) {
    return { error: "validation_error" };
  }
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "validation_error" };
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals: 2 });
  if (!amount) return { error: "invalid_amount" };
  return run(code, "price", (token) =>
    adminGateway().setPrice(token, code, period, currency, amount),
  );
}
