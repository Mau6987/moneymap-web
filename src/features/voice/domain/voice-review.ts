import Decimal from "decimal.js";

import type { components } from "@/lib/api/generated/schema";

export type VoiceEntry = components["schemas"]["VoiceEntryRead"];
export type VoiceStatus = VoiceEntry["status"];

/** El trabajador todavía no termina (spec 012 del back, RF-8). */
export const isProcessing = (status: VoiceStatus) =>
  status === "received" || status === "transcribed";

export interface VoiceAccount {
  id: string;
  name: string;
  currency: string;
  label: string;
  decimals: number;
  isDefault: boolean;
}

export interface VoiceCategory {
  id: string;
  name: string;
  type: string;
  color: string;
}

/** Lo que Quick Add trae cargado al corregir un dictado. */
export interface VoicePrefill {
  voiceEntryId: string;
  kind: "expense" | "income";
  /** Como lo escribiría el usuario, con coma decimal ("12,5"); vacío si falta. */
  amount: string;
  accountId?: string;
  categoryId?: string;
  date: string;
  description: string;
}

export type VoiceField = "kind" | "amount" | "category" | "account";

export interface VoiceReview {
  prefill: VoicePrefill;
  /** La del monto: la de la cuenta, o la dicha si no hay cuenta en ella. */
  currency: string;
  /** El monto con punto decimal, como lo da la API; null si falta. */
  amount: string | null;
  account?: VoiceAccount;
  category?: VoiceCategory;
  missing: Set<VoiceField>;
  /** Spec 002, RF-12: la frase dijo una moneda que ninguna cuenta tiene. */
  currencyWithoutAccount?: string;
  /** "Confirmar" guarda directo solo cuando no falta nada. */
  canConfirm: boolean;
}

const MAX_WHOLE_DIGITS = 15;

/**
 * La cuenta elegida por el modelo si va con la moneda dicha; si no, la
 * principal de esa moneda (RF-11); si no hay ninguna, la moneda vuelve sola
 * (RF-12). Sin moneda dicha, la elegida o la por defecto, como en Quick Add.
 */
function accountFor(
  accountId: string | null,
  currency: string | null,
  accounts: VoiceAccount[],
): [VoiceAccount | undefined, string | undefined] {
  const picked = accounts.find((a) => a.id === accountId);
  if (!currency) return [picked ?? accounts.find((a) => a.isDefault) ?? accounts[0], undefined];
  if (picked?.currency === currency) return [picked, undefined];
  const inCurrency = accounts.filter((a) => a.currency === currency);
  const account = inCurrency.find((a) => a.isDefault) ?? inCurrency[0];
  return account ? [account, undefined] : [undefined, currency];
}

/** El monto recortado a los decimales de la moneda, o null si no sirve. */
function amountFor(text: string | null, decimals: number): string | null {
  if (!text) return null;
  let value: Decimal;
  try {
    value = new Decimal(text);
  } catch {
    return null;
  }
  const cut = value.toDecimalPlaces(decimals, Decimal.ROUND_DOWN);
  if (cut.lte(0) || cut.trunc().toFixed(0).length > MAX_WHOLE_DIGITS) return null;
  return cut.toFixed();
}

/** Lo que se entendió de un movimiento: el principal o uno de `movements`. */
type Said = Pick<
  NonNullable<VoiceEntry["extraction"]>,
  | "kind"
  | "amount"
  | "currency"
  | "category_id"
  | "account_id"
  | "description"
  | "occurred_on"
  | "missing"
>;

/** Cruza un dictado con las cuentas y categorías del usuario (spec 002, RF-11 y RF-12). */
export function reviewOf(
  entry: VoiceEntry,
  accounts: VoiceAccount[],
  categories: VoiceCategory[],
  today: string,
): VoiceReview {
  return reviewOfSaid(entry.id, entry.extraction, accounts, categories, today);
}

/**
 * Como la app: una frase con varios movimientos ("almuerzo 35 y taxi 20") da
 * uno para revisar por cada uno, en el orden en que se dijeron.
 */
export function reviewsOf(
  entry: VoiceEntry,
  accounts: VoiceAccount[],
  categories: VoiceCategory[],
  today: string,
): VoiceReview[] {
  const movements = entry.extraction?.movements ?? [];
  if (movements.length < 2) return [reviewOf(entry, accounts, categories, today)];
  return movements.map((said) => reviewOfSaid(entry.id, said, accounts, categories, today));
}

function reviewOfSaid(
  entryId: string,
  said: Said | null | undefined,
  accounts: VoiceAccount[],
  categories: VoiceCategory[],
  today: string,
): VoiceReview {
  const unsure = new Set(said?.missing ?? []);
  const missing = new Set<VoiceField>();

  const kind = said?.kind ?? null;
  if (!kind || unsure.has("kind")) missing.add("kind");
  const type = kind ?? "expense";

  const category = categories.find((c) => c.id === said?.category_id && c.type === type);
  if (!category || unsure.has("category_id")) missing.add("category");

  const [account, currencyWithoutAccount] = accountFor(
    said?.account_id ?? null,
    said?.currency ?? null,
    accounts,
  );
  if (!account && !currencyWithoutAccount) missing.add("account");

  const amount = amountFor(said?.amount ?? null, account?.decimals ?? 2);
  if (!amount || unsure.has("amount")) missing.add("amount");

  return {
    prefill: {
      voiceEntryId: entryId,
      kind: type,
      amount: amount ? amount.replace(".", ",") : "",
      accountId: account?.id,
      categoryId: category?.id,
      date:
        said?.occurred_on && /^\d{4}-\d{2}-\d{2}$/.test(said.occurred_on)
          ? said.occurred_on
          : today,
      description: said?.description ?? "",
    },
    currency: currencyWithoutAccount ?? account?.currency ?? "",
    amount,
    account,
    category,
    missing,
    currencyWithoutAccount,
    canConfirm: missing.size === 0 && !currencyWithoutAccount,
  };
}
