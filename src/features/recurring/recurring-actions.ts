"use server";

import { randomUUID } from "node:crypto";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";
import { hasText } from "@/lib/text/name-rules";

import { recurringGateway, type Frequency, type RuleDraft } from "./data/recurring-gateway";

export interface RuleFormState {
  error?: string;
}

const FREQUENCIES: readonly Frequency[] = ["weekly", "biweekly", "monthly", "yearly"];

const kindOf = (form: FormData) => (form.get("kind") === "income" ? "income" : "expenses");

function readDraft(form: FormData): RuleDraft | { error: string } {
  const description = String(form.get("description") ?? "").trim();
  const decimals = Number(form.get("decimals") ?? 2);
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });
  const category = String(form.get("category") ?? "");
  const currency = String(form.get("currency") ?? "");
  const frequency = String(form.get("frequency") ?? "monthly") as Frequency;
  const start = String(form.get("start") ?? "");

  if (!description || description.length > 80) return { error: "description_required" };
  // BUG-003: "-" o un emoji solo no es un nombre.
  if (!hasText(description)) return { error: "description_text" };
  if (!amount) return { error: "invalid_amount" };
  if (!category) return { error: "category_required" };
  if (!/^[A-Z]{3}$/.test(currency) || !FREQUENCIES.includes(frequency)) {
    return { error: "validation_error" };
  }
  return {
    description,
    amount,
    category_id: category,
    currency,
    frequency,
    ...(/^\d{4}-\d{2}-\d{2}$/.test(start) ? { start_date: start } : {}),
  };
}

/** Spec 002 del back, RF-29: un ingreso o un gasto que se repite. */
export async function createRule(_previous: RuleFormState, form: FormData): Promise<RuleFormState> {
  const draft = readDraft(form);
  if ("error" in draft) return draft;
  try {
    await withAccessToken((token) => recurringGateway().create(token, draft));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/recurring/${kindOf(form)}?saved=saved`);
}

/**
 * RF-30: corrige monto, categoría o frecuencia; el próximo vencimiento sigue.
 * La moneda no cambia y la cuenta se elige al pagar (BUG-027).
 */
export async function updateRule(_previous: RuleFormState, form: FormData): Promise<RuleFormState> {
  const id = String(form.get("id") ?? "");
  const draft = readDraft(form);
  if ("error" in draft) return draft;
  // El primer vencimiento solo se elige al crear.
  const changes = {
    description: draft.description,
    amount: draft.amount,
    category_id: draft.category_id,
    frequency: draft.frequency,
  };
  try {
    await withAccessToken((token) => recurringGateway().update(token, id, changes));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/recurring/${kindOf(form)}?saved=saved`);
}

/** RF-31: deja de vencer; lo ya registrado se queda. */
export async function removeRule(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const kind = kindOf(form);
  try {
    await withAccessToken((token) => recurringGateway().remove(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/recurring/${kind}?error=${errorCode(error)}`);
  }
  redirect(`/recurring/${kind}?saved=removed`);
}

/** Desde dónde se puede pagar un vencido además de Fijos: vuelve ahí. */
const PAY_ORIGINS = ["/map", "/transactions"];

/**
 * Spec 003, RF-20: lo registra hoy y pasa al siguiente vencimiento. Los fijos
 * son recordatorios: nada se registra hasta que la persona lo paga. Con
 * `intent=skip` (ya lo pagó por fuera, RF-22) solo pasa al siguiente, sin
 * registrar nada ni tocar saldos.
 */
export async function payRule(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const kind = kindOf(form);
  const key = String(form.get("key") ?? "") || randomUUID();
  const origin = String(form.get("back") ?? "");
  const back = PAY_ORIGINS.includes(origin) ? origin : `/recurring/${kind}`;
  // En el Map se vuelve a la moneda que se estaba mirando.
  const currency = String(form.get("currency") ?? "");
  const keep = back === "/map" && /^[A-Z]{3}$/.test(currency) ? `&currency=${currency}` : "";
  const skip = form.get("intent") === "skip";
  try {
    // BUG-027: la cuenta elegida al pagar; sin ella, la del fijo.
    const account = String(form.get("account") ?? "") || undefined;
    await withAccessToken((token) =>
      skip ? recurringGateway().skip(token, id) : recurringGateway().pay(token, id, key, account),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(`${back}?error=${errorCode(error)}${keep}`);
  }
  redirect(`${back}?saved=${skip ? "skipped" : "paid"}${keep}`);
}

export async function attachRecurringReceipt(
  _previous: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const id = String(form.get("id") ?? "");
  const kind = kindOf(form);
  const file = form.get("receipt");
  if (!(file instanceof Blob) || file.size === 0) return { error: "invalid_receipt" };
  if (file.size > 5 * 1024 * 1024) return { error: "invalid_receipt" };
  try {
    await withAccessToken((token) => recurringGateway().attachReceipt(token, id, file));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/recurring/${kind}?edit=${id}&saved=saved`);
}

export async function removeRecurringReceipt(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const kind = kindOf(form);
  try {
    await withAccessToken((token) => recurringGateway().removeReceipt(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/recurring/${kind}?edit=${id}&error=${errorCode(error)}`);
  }
  redirect(`/recurring/${kind}?edit=${id}&saved=saved`);
}
