"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import { budgetsGateway } from "./data/budgets-gateway";

export interface BudgetFormState {
  error?: string;
}

const flag = (form: FormData, name: string) => form.get(name) === "on";

/** Backend spec 009, RF-1: un límite al mes para una categoría de gasto y una moneda. */
export async function createBudget(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const category = String(form.get("category") ?? "");
  const currency = String(form.get("currency") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });
  if (!category) return { error: "budget_category" };
  if (!amount) return { error: "invalid_amount" };
  if (!currency) return { error: "validation_error" };

  let id: string;
  try {
    id = (
      await withAccessToken((token) =>
        budgetsGateway().create(token, {
          category_id: category,
          amount,
          currency,
          alert_at_80: flag(form, "alert80"),
          alert_at_100: flag(form, "alert100"),
        }),
      )
    ).id;
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/budgets?budget=${id}&saved=created`);
}

/** RF-2: el límite y los avisos; para otra categoría o moneda se crea otro. */
export async function updateBudget(
  _previous: BudgetFormState,
  form: FormData,
): Promise<BudgetFormState> {
  const id = String(form.get("id") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });
  if (!amount) return { error: "invalid_amount" };

  try {
    await withAccessToken((token) =>
      budgetsGateway().update(token, id, {
        amount,
        alert_at_80: flag(form, "alert80"),
        alert_at_100: flag(form, "alert100"),
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/budgets?budget=${id}&saved=updated`);
}

/** RF-2: borra el presupuesto; los gastos no cambian. */
export async function deleteBudget(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  try {
    await withAccessToken((token) => budgetsGateway().remove(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/budgets?budget=${id}&error=${errorCode(error)}`);
  }
  redirect("/budgets?saved=deleted");
}
