"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { parseAmount } from "@/lib/money/parse";
import { cleanDescription, hasText } from "@/lib/text/name-rules";

import { voiceGateway } from "../voice/data/voice-gateway";
import { quickAddGateway } from "./data/quick-add-gateway";

export interface QuickAddState {
  /** El `code` de la API o de la validación, si no se pudo guardar. */
  error?: string;
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Registra un gasto o un ingreso (spec 002, RF-4 y RF-5). El monto llega como
 * lo escribió el usuario y se lee con los decimales de la moneda de la cuenta.
 * Si falla, lo escrito se conserva en el formulario y la clave no cambia.
 * Con `voice`, el movimiento sale de un dictado y queda enlazado a él (spec 012
 * del back, RF-9).
 */
export async function registerTransaction(
  _previous: QuickAddState,
  form: FormData,
): Promise<QuickAddState> {
  const kind = form.get("kind") === "income" ? "income" : "expense";
  const accountId = String(form.get("account") ?? "");
  const categoryId = String(form.get("category") ?? "");
  const decimals = Number(form.get("decimals") ?? 2);
  const occurredOn = String(form.get("date") ?? "");
  const description = cleanDescription(String(form.get("description") ?? ""));
  const key = String(form.get("key") ?? "");
  const voiceEntryId = String(form.get("voice") ?? "");
  const amount = parseAmount(String(form.get("amount") ?? ""), { decimals });

  if (!amount) return { error: "invalid_amount" };
  if (!accountId || !categoryId || !isDate(occurredOn) || !key)
    return { error: "validation_error" };
  // BUG-004: la descripción es opcional; si se escribe, con letras o números.
  if (description && !hasText(description)) return { error: "description_text" };

  try {
    await withAccessToken(async (token) => {
      const transactionId = await quickAddGateway().register(
        token,
        {
          kind,
          account_id: accountId,
          category_id: categoryId,
          amount,
          occurred_on: occurredOn,
          description,
          source: voiceEntryId ? "voice" : "quick_add",
        },
        key,
      );
      if (!voiceEntryId) return;
      // El movimiento ya quedó guardado: si el enlace falla, solo el dictado
      // queda sin confirmar en la API, así que no frena al usuario.
      await voiceGateway()
        .confirm(token, voiceEntryId, transactionId)
        .catch(() => undefined);
    });
  } catch (error) {
    // La sesión vencida redirige; lo demás se explica en el formulario.
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect(`/transactions?saved=${kind}`);
}

/** Un movimiento de la frase, ya revisado, como lo manda la lista del dictado. */
interface VoiceMovement {
  kind: "expense" | "income";
  account: string;
  category: string;
  amount: string;
  date: string;
  description: string;
}

/**
 * Como la app: "Confirmar 3" guarda todos los movimientos de una frase. Cada
 * uno lleva su propia clave (un reintento no los repite) y el dictado queda
 * enlazado al primero (spec 012 del back, RF-9).
 */
export async function registerVoiceMovements(
  _previous: QuickAddState,
  form: FormData,
): Promise<QuickAddState> {
  const voiceEntryId = String(form.get("voice") ?? "");
  const key = String(form.get("key") ?? "");
  let movements: VoiceMovement[];
  try {
    movements = JSON.parse(String(form.get("movements") ?? "[]")) as VoiceMovement[];
  } catch {
    return { error: "validation_error" };
  }
  if (!key || movements.length === 0) return { error: "validation_error" };
  for (const m of movements) {
    if (!/^\d+(\.\d+)?$/.test(m.amount) || !m.account || !m.category || !isDate(m.date)) {
      return { error: "validation_error" };
    }
  }
  try {
    await withAccessToken(async (token) => {
      const ids: string[] = [];
      for (const [i, m] of movements.entries()) {
        ids.push(
          await quickAddGateway().register(
            token,
            {
              kind: m.kind,
              account_id: m.account,
              category_id: m.category,
              amount: m.amount,
              occurred_on: m.date,
              description: cleanDescription(m.description),
              source: "voice",
            },
            `${key}-${i}`,
          ),
        );
      }
      if (!voiceEntryId || !ids[0]) return;
      await voiceGateway()
        .confirm(token, voiceEntryId, ids[0])
        .catch(() => undefined);
    });
  } catch (error) {
    unstable_rethrow(error);
    return { error: errorCode(error) };
  }
  redirect("/transactions?saved=voice");
}
