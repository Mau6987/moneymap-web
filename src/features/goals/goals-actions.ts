"use server";

import { isoToday } from "@/features/map/domain/map";
import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import { goalsGateway, type GoalDraft } from "./data/goals-gateway";
import { DEFAULT_PRIORITY, PRIORITIES, parseTargetDate } from "./domain/goal";

export interface GoalFormState {
  error?: string;
}

function readDraft(form: FormData): GoalDraft | { error: string } {
  const name = String(form.get("name") ?? "").trim();
  const decimals = Number(form.get("decimals") ?? 2);
  const target = parseAmount(String(form.get("target") ?? ""), { decimals });
  const date = parseTargetDate(String(form.get("date") ?? ""));
  const priority = Number(form.get("priority") ?? DEFAULT_PRIORITY);

  if (!name || name.length > 80) return { error: "goal_name" };
  if (!target) return { error: "invalid_amount" };
  if (date === undefined) return { error: "validation_error" };
  return {
    name,
    target_amount: target,
    target_date: date,
    priority: (PRIORITIES as readonly number[]).includes(priority) ? priority : DEFAULT_PRIORITY,
  };
}

/** Spec 005, RF-1: la moneda se elige una vez, entre Mis monedas. */
export async function createGoal(_previous: GoalFormState, form: FormData): Promise<GoalFormState> {
  const draft = readDraft(form);
  if ("error" in draft) return draft;
  const currency = String(form.get("currency") ?? "");
  if (!currency) return { error: "validation_error" };

  let id: string;
  try {
    id = (await withAccessToken((token) => goalsGateway().create(token, { ...draft, currency })))
      .id;
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/goals?goal=${id}&saved=created`);
}

/** Spec 005, RF-4: nombre, objetivo, fecha y prioridad; la moneda no cambia. */
export async function updateGoal(_previous: GoalFormState, form: FormData): Promise<GoalFormState> {
  const id = String(form.get("id") ?? "");
  const draft = readDraft(form);
  if ("error" in draft) return draft;

  try {
    await withAccessToken((token) => goalsGateway().update(token, id, draft));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/goals?goal=${id}&saved=updated`);
}

/** Spec 005, RF-5: borra la meta y sus aportes; ninguna cuenta cambia. */
export async function deleteGoal(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  try {
    await withAccessToken((token) => goalsGateway().remove(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/goals?goal=${id}&error=${errorCode(error)}`);
  }
  redirect("/goals?saved=deleted");
}

/**
 * Borrar una meta con ahorro, como la app: primero devuelve todo lo ahorrado a
 * la cuenta elegida y después la borra (el back no borra una meta con saldo,
 * 409 goal_has_saved).
 */
export async function withdrawAndDelete(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const account = String(form.get("account") ?? "");
  const saved = String(form.get("saved") ?? "");
  const key = String(form.get("key") ?? "");
  if (!account || !/^\d+(\.\d+)?$/.test(saved) || !key) {
    redirect(`/goals?goal=${id}&confirm=delete&error=validation_error`);
  }
  try {
    await withAccessToken(async (token) => {
      const gateway = goalsGateway();
      await gateway.withdraw(token, id, saved, isoToday(), key, account);
      await gateway.remove(token, id);
    });
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/goals?goal=${id}&confirm=delete&error=${errorCode(error)}`);
  }
  redirect("/goals?saved=deleted");
}

/** Lo que mandan los paneles de Aportar y Retirar: siempre con una cuenta. */
function readMove(form: FormData) {
  const id = String(form.get("id") ?? "");
  const account = String(form.get("account") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });
  const on = String(form.get("date") ?? "");
  const key = String(form.get("key") ?? "");
  if (!amount) return { error: "invalid_amount" };
  if (!account || !/^\d{4}-\d{2}-\d{2}$/.test(on) || !key) return { error: "validation_error" };
  return { id, account, amount, on, key };
}

/**
 * Spec 005, RF-6 a RF-8 y RF-21: un aporte en la moneda de la meta, una sola
 * vez; el dinero sale de una de las cuentas (efectivo o tarjeta).
 */
export async function contribute(_previous: GoalFormState, form: FormData): Promise<GoalFormState> {
  const move = readMove(form);
  if ("error" in move) return { error: move.error };
  try {
    await withAccessToken((token) =>
      goalsGateway().contribute(token, move.id, move.amount, move.on, move.key, move.account),
    );
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/goals?goal=${move.id}&saved=contributed`);
}

/** Spec 005, RF-20: lo ahorrado vuelve a una de las cuentas, como mucho lo que tiene la meta. */
export async function withdraw(_previous: GoalFormState, form: FormData): Promise<GoalFormState> {
  const move = readMove(form);
  if ("error" in move) return { error: move.error };
  try {
    await withAccessToken((token) =>
      goalsGateway().withdraw(token, move.id, move.amount, move.on, move.key, move.account),
    );
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/goals?goal=${move.id}&saved=withdrawn`);
}
