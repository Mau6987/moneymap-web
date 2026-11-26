"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";
import { budgetErrorText } from "@/lib/i18n/budgets-messages";
import { parseAmount } from "@/lib/money/parse";

import { TOP_CATEGORIES, visibleCategories } from "../../quick-add/domain/categories";
import type { BudgetFormState } from "../budgets-actions";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: BudgetFormState, form: FormData) => Promise<BudgetFormState>;

export interface BudgetCurrency {
  code: string;
  name: string;
  label: string;
  decimals: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
}

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * "Nuevo presupuesto" o su edición (spec 009 del back, RF-1, RF-2 y RF-10).
 * Al crear se elige una categoría de gasto que no tenga presupuesto en esa
 * moneda; al editar solo cambian el límite y los avisos.
 */
export function BudgetForm({
  action,
  currencies,
  freeByCurrency,
  initial,
}: {
  action: Action;
  /** Mis monedas, la principal primero. Al editar, solo la del presupuesto. */
  currencies: BudgetCurrency[];
  /** Las categorías de gasto sin presupuesto, por moneda. */
  freeByCurrency: Record<string, BudgetCategory[]>;
  initial?: { id: string; name: string; amount: string; alert80: boolean; alert100: boolean };
}) {
  const i18n = useMessages();
  const t = i18n.budgets;
  const [state, formAction, pending] = useActionState(action, {});
  const [currency, setCurrency] = useState(currencies[0]?.code ?? "");
  const [category, setCategory] = useState("");
  const [allCategories, setAllCategories] = useState(false);
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [alert80, setAlert80] = useState(initial?.alert80 ?? true);
  const [alert100, setAlert100] = useState(initial?.alert100 ?? true);
  const info = currencies.find((c) => c.code === currency) ?? currencies[0];
  const decimals = info?.decimals ?? 2;
  const free = freeByCurrency[currency] ?? [];
  // MM-179: las 4 más usadas a la vista; "Más" abre el resto.
  const shown = visibleCategories(free, category, allCategories);
  const hidden = free.length - visibleCategories(free, category, false).length;
  const valid =
    parseAmount(amount, { decimals }) !== null &&
    (!!initial || free.some((c) => c.id === category));

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="decimals" value={decimals} />
      {!initial && (
        <>
          <input type="hidden" name="category" value={category} />
          <div className="flex flex-col gap-1">
            <label htmlFor="budget-currency" className="text-sm font-bold">
              {t.currency}
            </label>
            <select
              id="budget-currency"
              name="currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setCategory("");
              }}
              aria-describedby="budget-currency-hint"
              className="focus-ring bg-field border-line h-12 rounded-[16px] border px-3 text-sm font-semibold"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
            <span id="budget-currency-hint" className="text-muted text-xs">
              {t.currencyHint}
            </span>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t.category}</legend>
            {free.length === 0 ? (
              <p className="text-muted text-sm">{t.noFreeCategory}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {shown.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                    className={chip(category === c.id)}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ background: c.color }}
                    />
                    {c.name}
                  </button>
                ))}
                {free.length > TOP_CATEGORIES && (allCategories || hidden > 0) && (
                  <button
                    type="button"
                    aria-expanded={allCategories}
                    onClick={() => setAllCategories((open) => !open)}
                    className="focus-ring text-primary-text inline-flex h-10 items-center rounded-full border border-dashed border-current px-4 text-sm font-bold"
                  >
                    {allCategories
                      ? i18n.quickAdd.fewerCategories
                      : i18n.quickAdd.moreCategories(hidden)}
                  </button>
                )}
              </div>
            )}
          </fieldset>
        </>
      )}
      <TextField
        label={`${t.amount}${info ? ` (${info.label})` : ""}`}
        name="amount"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold">{t.alerts}</legend>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="alert80"
            checked={alert80}
            onChange={(e) => setAlert80(e.target.checked)}
            className="focus-ring size-5 accent-[var(--mm-primary)]"
          />
          {t.alert80}
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="alert100"
            checked={alert100}
            onChange={(e) => setAlert100(e.target.checked)}
            className="focus-ring size-5 accent-[var(--mm-primary)]"
          />
          {t.alert100}
        </label>
      </fieldset>
      <p className="text-muted text-xs">{t.note}</p>
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {budgetErrorText(state.error, i18n.locale)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link
          href={initial ? `/budgets?budget=${initial.id}` : "/budgets"}
          className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
        >
          {t.cancel}
        </Link>
        <Button type="submit" size="md" disabled={pending || !valid}>
          {initial ? t.save : t.create}
        </Button>
      </div>
    </form>
  );
}
