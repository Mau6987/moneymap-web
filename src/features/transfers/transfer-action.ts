"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";

import { transfersGateway } from "./data/transfers-gateway";

export interface TransferState {
  /** El `code` de la API o de la validación, si no se pudo guardar. */
  error?: string;
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Registra una transferencia entre dos cuentas de la misma moneda (spec 002,
 * RF-7). Si falla, lo escrito se conserva y la clave no cambia (RF-16).
 */
export async function registerTransfer(
  _previous: TransferState,
  form: FormData,
): Promise<TransferState> {
  const fromAccountId = String(form.get("from") ?? "");
  const toAccountId = String(form.get("to") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const occurredOn = String(form.get("date") ?? "");
  const description = String(form.get("description") ?? "").trim();
  const key = String(form.get("key") ?? "");
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });

  if (!amount) return { error: "invalid_amount" };
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return { error: "validation_error" };
  }
  if (!isDate(occurredOn) || !key) return { error: "validation_error" };

  try {
    await withAccessToken((token) =>
      transfersGateway().register(
        token,
        { fromAccountId, toAccountId, amount, occurredOn, description },
        key,
      ),
    );
  } catch (error) {
    // La sesión vencida redirige; lo demás se explica en el formulario.
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/transactions?saved=transfer");
}
