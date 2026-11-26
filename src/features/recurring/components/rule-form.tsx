"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";

import { recurringErrorText } from "@/lib/i18n/recurring-messages";
import { parseAmount } from "@/lib/money/parse";

import type { QuickAddAccount, QuickAddCategory } from "../../quick-add/components/quick-add-form";
import { TOP_CATEGORIES, visibleCategories } from "../../quick-add/domain/categories";
import type { RecurringRule } from "../data/recurring-gateway";
import type { RuleFormState } from "../recurring-actions";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: RuleFormState, form: FormData) => Promise<RuleFormState>;

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-left text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * Nuevo o editar un ingreso o gasto fijo (mockup "Onb-Gastos" y app
 * MM-152): qué es, monto en la moneda de la cuenta, categoría (las 4 más
 * usadas y "Más"), cada cuánto y el primer vencimiento.
 */
export function RuleForm({
  action,
  kind,
  accounts,
  categories,
  today,
  rule,
}: {
  action: Action;
  kind: "income" | "expenses";
  accounts: QuickAddAccount[];
  /** Solo las del tipo, las más usadas primero. */
  categories: QuickAddCategory[];
  today: string;
  rule?: RecurringRule;
}) {
  const i18n = useMessages();
  const t = i18n.recurring;
  const quickAddMessages = i18n.quickAdd;
  const [state, formAction, pending] = useActionState(action, {});
  // BUG-027, como la app: el fijo va en una moneda y la cuenta se elige al
  // pagarlo. Se ofrecen las monedas de las cuentas; al editar, la suya.
  const currencies = [...new Set(accounts.map((a) => a.currency))];
  const initial =
    accounts.find((a) => a.currency === rule?.currency) ??
    accounts.find((a) => a.isDefault) ??
    accounts[0];
  const [currency, setCurrency] = useState(rule?.currency ?? initial?.currency ?? "");
  const [categoryId, setCategoryId] = useState(rule?.category_id ?? "");
  const [all, setAll] = useState(false);
  const [frequency, setFrequency] = useState(rule?.frequency ?? "monthly");
  // El monto de la API ("12000.00") en el formato que se escribe aquí ("12000,00").
  const [amount, setAmount] = useState(rule?.amount.replace(".", ",") ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [start, setStart] = useState(today);

  if (!initial) return null;
  const account = accounts.find((a) => a.currency === currency) ?? initial;
  const visible = visibleCategories(categories, categoryId, all);
  const hidden = categories.length - visibleCategories(categories, categoryId, false).length;
  const valid =
    description.trim() !== "" &&
    parseAmount(amount, { decimals: account.decimals }) !== null &&
    categories.some((c) => c.id === categoryId);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="category" value={categoryId} />
      <input type="hidden" name="frequency" value={frequency} />
      <input type="hidden" name="decimals" value={account.decimals} />
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <TextField
        label={t.description}
        name="description"
        placeholder={t.hint[kind]}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={80}
      />
      <TextField
        label={`${t.amount} (${account.label})`}
        name="amount"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint={t.note}
      />

      <fieldset>
        <legend className="text-muted mb-2 text-xs font-bold">{t.category}</legend>
        <div className="flex flex-wrap gap-2">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={chip(categoryId === c.id)}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: c.color }}
              />
              {c.name}
            </button>
          ))}
          {categories.length > TOP_CATEGORIES && (all || hidden > 0) && (
            <button
              type="button"
              aria-expanded={all}
              onClick={() => setAll((open) => !open)}
              className="focus-ring text-primary-text inline-flex h-10 items-center rounded-full border border-dashed border-current px-4 text-sm font-bold"
            >
              {all ? quickAddMessages.fewerCategories : quickAddMessages.moreCategories(hidden)}
            </button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-muted mb-2 text-xs font-bold">{t.currency}</legend>
        <div role="radiogroup" aria-label={t.currency} className="flex flex-wrap gap-2">
          {(rule ? [rule.currency] : currencies).map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={code === currency}
              onClick={() => setCurrency(code)}
              className={chip(code === currency)}
            >
              {code}
            </button>
          ))}
        </div>
        <p className="text-muted mt-1.5 text-xs">{t.accountAtPay}</p>
      </fieldset>

      <fieldset>
        <legend className="text-muted mb-2 text-xs font-bold">{t.repeats}</legend>
        <div role="radiogroup" aria-label={t.repeats} className="flex flex-wrap gap-2">
          {(["weekly", "biweekly", "monthly", "yearly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={frequency === f}
              onClick={() => setFrequency(f)}
              className={chip(frequency === f)}
            >
              {t.frequency[f]}
            </button>
          ))}
        </div>
      </fieldset>

      {!rule && (
        <TextField
          label={t.start}
          name="start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      )}

      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {recurringErrorText(state.error, i18n.locale)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link
          href={`/recurring/${kind}`}
          className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
        >
          {t.cancel}
        </Link>
        <Button type="submit" size="md" disabled={!valid || pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
