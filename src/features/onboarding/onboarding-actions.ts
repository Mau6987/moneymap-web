"use server";

import Decimal from "decimal.js";
import { redirect, unstable_rethrow } from "next/navigation";

import { ApiError, errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";

import { parseAmount } from "@/lib/money/parse";
import { hasText } from "@/lib/text/name-rules";

import {
  onboardingGateway,
  type Category,
  type OnboardingGateway,
  type PeriodType,
} from "./data/onboarding-gateway";

import { getMessages } from "@/lib/i18n/server";
export interface StepState {
  error?: string;
}

type Action = (gateway: OnboardingGateway, token: string) => Promise<void>;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const country = (form: FormData) => text(form, "country").toUpperCase().slice(0, 2);
const go = (step: string, form: FormData): never => {
  const code = country(form);
  return redirect(`/onboarding?step=${step}${code ? `&country=${code}` : ""}`);
};

/** Corre los guardados de un paso; con un error, el paso queda con lo escrito (RF-11). */
async function run(action: Action): Promise<string | undefined> {
  try {
    await withAccessToken((token) => action(onboardingGateway(), token));
  } catch (error) {
    unstable_rethrow(error);
    return errorCode(error);
  }
  return undefined;
}

/** La categoría inicial de una plantilla o, si el usuario la borró, la de "otros". */
function categoryFor(categories: Category[], template: string, type: "income" | "expense") {
  const found =
    categories.find((c) => c.template_key === template) ??
    categories.find((c) => c.template_key === `other_${type}`) ??
    categories.find((c) => c.type === type);
  if (!found) throw new ApiError("not_found", 404);
  return found;
}

/** País: solo sugiere la moneda y el catálogo de bancos; no se guarda. */
export async function chooseCountry(form: FormData): Promise<void> {
  return go("currency", form);
}

/** RF-2 y RF-12: la moneda principal; la API crea las categorías iniciales. */
export async function saveCurrency(_previous: StepState, form: FormData): Promise<StepState> {
  const code = text(form, "currency");
  if (!/^[A-Z]{3}$/.test(code)) return { error: "validation_error" };
  const error = await run(async (gateway, token) => {
    const status = await gateway.status(token);
    if (status.main_currency !== code) await gateway.saveMainCurrency(token, code);
  });
  if (error) return { error };
  return go("accounts", form);
}

/**
 * RF-3 y RF-4: primero el efectivo, que queda como cuenta por defecto, y una
 * tarjeta opcional. Un reintento no repite la cuenta que ya se creó.
 */
export async function saveAccounts(_previous: StepState, form: FormData): Promise<StepState> {
  const i18n = await getMessages();
  const t = i18n.onboarding;
  const currency = text(form, "currency");
  const decimals = Number(text(form, "decimals") || 2);
  const cash = parseAmount(text(form, "cash") || "0", { decimals, allowZero: true });
  if (!cash) return { error: "invalid_amount" };

  const hasCard = form.get("has_card") === "true";
  const bank = text(form, "bank_name");
  const institution = text(form, "institution") || null;
  const last4 = text(form, "last4");
  const cardBalance = parseAmount(text(form, "card") || "0", { decimals, allowZero: true });
  // BUG-041: la tarjeta necesita sus 4 dígitos y su saldo escrito (0 vale),
  // como en la app; vacío no se guarda como Bs 0.
  if (hasCard) {
    if (!bank) return { error: "bank_required" };
    if (!/^\d{4}$/.test(last4)) return { error: "invalid_last4" };
    if (!text(form, "card")) return { error: "card_balance_required" };
    if (!cardBalance) return { error: "invalid_amount" };
  }

  const error = await run(async (gateway, token) => {
    let { accounts } = await gateway.status(token);
    if (accounts === 0) {
      await gateway.createAccount(token, {
        name: t.accounts.cashName,
        type: "cash",
        currency,
        opening_balance: cash,
      });
      accounts += 1;
    }
    if (hasCard && cardBalance && accounts < 2) {
      await gateway.createAccount(token, {
        name: t.accounts.cardName(bank),
        type: "card",
        currency,
        opening_balance: cardBalance,
        institution_code: institution,
        last4,
      });
    }
  });
  if (error) return { error };
  return go("period", form);
}

type Frequency = "weekly" | "biweekly" | "monthly" | "yearly";
const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly", "yearly"];

const PERIODS: PeriodType[] = ["weekly", "semi_monthly", "monthly"];

/** El periodo con que se calcula Safe to Spend. "Omitir ingreso y gastos" va al final (RF-9). */
export async function savePeriod(_previous: StepState, form: FormData): Promise<StepState> {
  const period = PERIODS.find((p) => p === text(form, "period")) ?? "monthly";
  const error = await run((gateway, token) => gateway.savePeriod(token, period));
  if (error) return { error };
  return go(form.get("skip") === "true" ? "ready" : "income", form);
}

/** RF-5: el ingreso mensual, opcional; vacío pasa al siguiente paso. */
export async function saveIncome(_previous: StepState, form: FormData): Promise<StepState> {
  const i18n = await getMessages();
  const t = i18n.onboarding;
  const decimals = Number(text(form, "decimals") || 2);
  const written = text(form, "amount");
  if (form.get("skip") === "true" || !written) return go("expenses", form);
  const amount = parseAmount(written, { decimals });
  if (!amount) return { error: "invalid_amount" };
  const kind = text(form, "kind") || "salary";

  const error = await run(async (gateway, token) => {
    const status = await gateway.status(token);
    if (status.income_rules > 0) return;
    const found = categoryFor(await gateway.categories(token), kind, "income");
    await gateway.createRule(token, {
      category_id: found.id,
      amount,
      description: found.name || t.income.fallback,
      frequency: "monthly",
      auto_post: false,
    });
  });
  if (error) return { error };
  return go("expenses", form);
}

/**
 * RF-6: los gastos fijos con monto, cada uno con la categoría de su plantilla.
 * Uno que ya está guardado (mismo nombre y monto) no se repite al reintentar.
 */
export async function saveExpenses(_previous: StepState, form: FormData): Promise<StepState> {
  const i18n = await getMessages();
  const t = i18n.onboarding;
  const decimals = Number(text(form, "decimals") || 2);
  const rows: {
    template: string;
    name: string;
    amount: string;
    frequency: Frequency;
    due: string | null;
  }[] = [];
  if (form.get("skip") !== "true") {
    const templates = form.getAll("template").map(String);
    const names = form.getAll("name").map((n) => String(n).trim());
    const amounts = form.getAll("amount").map((a) => String(a).trim());
    // BUG-021: como en la app, cada cuánto se repite y cuándo vence.
    const frequencies = form.getAll("frequency").map(String);
    const dues = form.getAll("due").map(String);
    for (const [i, template] of templates.entries()) {
      const written = amounts[i] ?? "";
      if (!written) continue;
      const amount = parseAmount(written, { decimals });
      if (!amount) return { error: "invalid_amount" };
      // BUG-002: un gasto con monto necesita un nombre con letras o números.
      const name = names[i] ?? "";
      if (!hasText(name)) return { error: "expense_name" };
      const frequency = FREQUENCIES.find((f) => f === frequencies[i]) ?? "monthly";
      const due = /^\d{4}-\d{2}-\d{2}$/.test(dues[i] ?? "") ? dues[i]! : null;
      rows.push({ template, name, amount, frequency, due });
    }
  }

  const error = await run(async (gateway, token) => {
    if (rows.length === 0) return;
    const [categories, saved] = await Promise.all([
      gateway.categories(token),
      gateway.rules(token),
    ]);
    for (const row of rows) {
      const found = categoryFor(categories, row.template, "expense");
      const description = row.name || found.name || t.expenses.fallback;
      const exists = saved.some(
        (r) =>
          r.type === "expense" &&
          r.description.toLowerCase() === description.toLowerCase() &&
          new Decimal(r.amount).equals(row.amount),
      );
      if (exists) continue;
      await gateway.createRule(token, {
        category_id: found.id,
        amount: row.amount,
        description,
        frequency: row.frequency,
        ...(row.due ? { start_date: row.due } : {}),
        auto_post: false,
      });
    }
  });
  if (error) return { error };
  return go("ready", form);
}
