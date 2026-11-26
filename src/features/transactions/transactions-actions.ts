"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";
import { hasText } from "@/lib/text/name-rules";

import { MAX_RECEIPT_BYTES, transactionsGateway } from "./data/transactions-gateway";

export interface MovementFormState {
  error?: string;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** A dónde vuelve: Movimientos con los filtros que tenía, sin el panel abierto. */
function backTo(form: FormData, saved: string): string {
  const back = text(form, "back");
  const base = back.startsWith("/transactions") ? back : "/transactions";
  return `${base}${base.includes("?") ? "&" : "?"}saved=${saved}`;
}

/**
 * Corrige un gasto o un ingreso, como la app: el monto, la categoría, la
 * cuenta (de su misma moneda), la fecha y la descripción. El saldo lo recalcula
 * la API.
 */
export async function updateMovement(
  _previous: MovementFormState,
  form: FormData,
): Promise<MovementFormState> {
  const id = text(form, "id");
  const decimals = Number(text(form, "decimals") || 2);
  const amount = parseAmount(text(form, "amount"), { decimals });
  if (!amount) return { error: "invalid_amount" };
  const description = text(form, "description");
  if (description && !hasText(description)) return { error: "description_text" };
  const date = text(form, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "validation_error" };
  try {
    await withAccessToken((token) =>
      transactionsGateway().update(token, id, {
        amount,
        account_id: text(form, "account") || null,
        category_id: text(form, "category") || null,
        occurred_on: date,
        description,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(backTo(form, "updated"));
}

/** Borra un movimiento: el monto vuelve al saldo de su cuenta. */
export async function deleteMovement(form: FormData): Promise<void> {
  const id = text(form, "id");
  try {
    await withAccessToken((token) => transactionsGateway().remove(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/transactions?error=${errorCode(error)}`);
  }
  redirect(backTo(form, "deleted"));
}

/** Vuelve al mismo gasto, con el panel abierto. */
const backToMovement = (form: FormData, saved: string) =>
  `${backTo(form, saved)}&movement=${encodeURIComponent(text(form, "id"))}`;

/**
 * Spec 014 del back: adjunta o reemplaza la foto del comprobante de un gasto.
 * El formato real lo revisa la API; acá solo que haya un archivo de hasta 5 MB.
 */
export async function attachReceipt(
  _previous: MovementFormState,
  form: FormData,
): Promise<MovementFormState> {
  const id = text(form, "id");
  const photo = form.get("receipt");
  if (!(photo instanceof Blob) || photo.size === 0 || photo.size > MAX_RECEIPT_BYTES) {
    return { error: "invalid_receipt" };
  }
  try {
    await withAccessToken((token) => transactionsGateway().attachReceipt(token, id, photo));
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(backToMovement(form, "receipt"));
}

/** Quita la foto del comprobante. */
export async function removeReceipt(form: FormData): Promise<void> {
  const id = text(form, "id");
  try {
    await withAccessToken((token) => transactionsGateway().removeReceipt(token, id));
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/transactions?error=${errorCode(error)}`);
  }
  redirect(backToMovement(form, "receipt_removed"));
}
