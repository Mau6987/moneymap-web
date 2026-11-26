"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import { accountsGateway } from "./data/accounts-gateway";
import { validateName } from "./domain/account-validation";

export interface AccountFormState {
  error?: string;
}

/**
 * Crea una cuenta (spec 002, RF-1 a RF-3). La moneda se elige una vez; el
 * saldo inicial se lee con sus decimales y puede ser cero.
 */
export async function createAccount(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const type = form.get("type") === "card" ? "card" : "cash";
  const name = String(form.get("name") ?? "").trim();
  const currency = String(form.get("currency") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const last4 = String(form.get("last4") ?? "").trim();
  const opening = parseAmount(String(form.get("opening") ?? "") || "0", {
    decimals,
    allowZero: true,
  });

  const nameError = validateName(name);
  if (nameError) return { error: nameError };
  if (!opening) return { error: "invalid_amount" };
  if (last4 && !/^\d{4}$/.test(last4)) return { error: "invalid_last4" };
  if (!currency) return { error: "validation_error" };

  try {
    await withAccessToken((token) =>
      accountsGateway().create(token, {
        name,
        type,
        currency,
        opening_balance: opening,
        ...(type === "card" && last4 ? { last4 } : {}),
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/accounts?saved=created");
}

/** Renombra una cuenta; la moneda no se toca (RF-15). */
export async function renameAccount(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  try {
    await withAccessToken((token) => accountsGateway().rename(token, id, name));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/accounts?saved=renamed");
}
