"use client";

import { CategoryIcon } from "@/components/category-icon";
import { AccountChipText } from "@/components/account-chip-text";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/button";
import { cx } from "@/lib/cx";
import { moneyErrorText } from "@/lib/i18n/money-messages";
import { parseAmount } from "@/lib/money/parse";
import { cleanDescription, hasText } from "@/lib/text/name-rules";

import type { VoicePrefill } from "../../voice/domain/voice-review";
import { TOP_CATEGORIES, visibleCategories } from "../domain/categories";
import type { QuickAddState } from "../quick-add-action";

import { useMessages } from "@/lib/i18n/client";
export interface QuickAddAccount {
  id: string;
  name: string;
  currency: string;
  /** El símbolo o el código, según el catálogo (spec 002, RF-10). */
  label: string;
  decimals: number;
  isDefault: boolean;
  /** BUG-060: el saldo ya escrito, para mostrarlo junto al nombre. */
  balance?: string;
}

export interface QuickAddCategory {
  id: string;
  name: string;
  type: string;
  color: string;
  /** El ícono de la app, si se conoce. */
  icon?: string;
}

interface QuickAddFormProps {
  action: (state: QuickAddState, form: FormData) => Promise<QuickAddState>;
  accounts: QuickAddAccount[];
  /** Ya ordenadas: las más usadas primero (MM-176). */
  categories: QuickAddCategory[];
  today: string;
  /** La misma para cada intento de este movimiento: un reintento no registra dos. */
  idempotencyKey: string;
  /** Un dictado a corregir: el movimiento queda enlazado a él al guardar. */
  initial?: VoicePrefill;
}

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-left text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * Quick Add (spec 002, RF-4 y RF-5; mockup "Web-Registrar"): un gasto o un
 * ingreso en pocos toques. No hay selector de moneda: el monto va en la de la
 * cuenta y acepta solo sus decimales.
 */
export function QuickAddForm({
  action,
  accounts,
  categories,
  today,
  idempotencyKey,
  initial: seed,
}: QuickAddFormProps) {
  const i18n = useMessages();
  const t = i18n.quickAdd;
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState<"expense" | "income">(seed?.kind ?? "expense");
  const initial = accounts.find((a) => a.isDefault) ?? accounts[0];
  const [accountId, setAccountId] = useState(seed?.accountId ?? initial?.id ?? "");
  const [categoryId, setCategoryId] = useState(seed?.categoryId ?? "");
  // MM-176: solo las 4 más usadas a la vista; "Más" abre el resto.
  const [allCategories, setAllCategories] = useState(false);
  const [amount, setAmount] = useState(seed?.amount ?? "");
  // Controlados: si guardar falla, lo escrito se queda (spec 002, RF-16).
  const [date, setDate] = useState(seed?.date ?? today);
  const [description, setDescription] = useState(seed?.description ?? "");

  if (!initial) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm font-semibold">{t.noAccounts}</p>
        <ButtonLink href="/accounts" size="md">
          {t.addAccount}
        </ButtonLink>
      </div>
    );
  }

  const account = accounts.find((a) => a.id === accountId) ?? initial;
  const shown = categories.filter((c) => c.type === kind);
  const visible = visibleCategories(shown, categoryId, allCategories);
  const hiddenCount = shown.length - visibleCategories(shown, categoryId, false).length;
  const valid = parseAmount(amount, { decimals: account.decimals }) !== null;
  // BUG-050: la descripción es opcional; si se escribe, con letras o números.
  const cleanedDescription = cleanDescription(description);
  const descriptionError = cleanedDescription !== "" && !hasText(cleanedDescription);
  const canSave = valid && shown.some((c) => c.id === categoryId) && !descriptionError && !pending;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="account" value={account.id} />
      <input type="hidden" name="category" value={categoryId} />
      <input type="hidden" name="decimals" value={account.decimals} />
      <input type="hidden" name="key" value={idempotencyKey} />
      {seed && <input type="hidden" name="voice" value={seed.voiceEntryId} />}

      {/* BUG-033: Gasto e Ingreso a lo ancho, como en la app. */}
      <div
        role="radiogroup"
        aria-label={t.kind}
        className="bg-well grid grid-cols-2 gap-1 rounded-full p-1"
      >
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k);
              setCategoryId("");
            }}
            className={cx(
              "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold",
              kind !== k
                ? "text-muted"
                : k === "expense"
                  ? "bg-[#b5422b] text-white"
                  : "bg-green-text text-white dark:text-[#0d1022]",
            )}
          >
            <span aria-hidden="true">{k === "expense" ? "↗" : "↙"}</span>
            {k === "expense" ? t.expense : t.income}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quick-add-amount" className="text-muted text-xs font-bold">
          {t.amount}
        </label>
        <span className="flex items-center gap-3">
          <span className="text-muted text-2xl font-extrabold">{account.label}</span>
          <input
            id="quick-add-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            aria-describedby="quick-add-currency"
            className={cx(
              "focus-ring min-w-0 flex-1 bg-transparent text-[44px] font-extrabold tracking-[-0.03em] tabular-nums outline-none",
              kind === "expense" ? "text-coral-text" : "text-green-text",
            )}
          />
          <span className="bg-well rounded-full px-3 py-1 text-xs font-extrabold">
            {account.currency}
          </span>
        </span>
        <span id="quick-add-currency" className="text-muted text-xs">
          {t.amountHint(account.currency)}
        </span>
      </div>

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
              {c.icon ? (
                <span style={{ color: c.color }}>
                  <CategoryIcon name={c.icon} className="size-4" />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ background: c.color }}
                />
              )}
              {c.name}
            </button>
          ))}
          {shown.length > TOP_CATEGORIES && (allCategories || hiddenCount > 0) && (
            <button
              type="button"
              aria-expanded={allCategories}
              onClick={() => setAllCategories((open) => !open)}
              className="focus-ring text-primary-text inline-flex h-10 items-center rounded-full border border-dashed border-current px-4 text-sm font-bold"
            >
              {allCategories ? t.fewerCategories : t.moreCategories(hiddenCount)}
            </button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-muted mb-2 text-xs font-bold">{t.account}</legend>
        <div role="radiogroup" aria-label={t.account} className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === account.id}
              onClick={() => setAccountId(a.id)}
              className={chip(a.id === account.id)}
            >
              <AccountChipText name={a.name} currency={a.currency} balance={a.balance} />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted text-xs font-bold">{t.date}</span>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="focus-ring bg-field border-line h-11 rounded-[14px] border px-3 text-sm font-semibold"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-xs font-bold">{t.description}</span>
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder={t.descriptionHint}
            aria-invalid={descriptionError}
            aria-describedby={descriptionError ? "quick-add-description-error" : undefined}
            className={cx(
              "focus-ring bg-field h-11 rounded-[14px] border px-3 text-sm font-semibold",
              descriptionError ? "border-coral-text" : "border-line",
            )}
          />
          {descriptionError && (
            <span
              id="quick-add-description-error"
              className="text-coral-text text-xs font-bold"
              data-testid="quick-add-description-error"
            >
              {moneyErrorText("description_text", i18n.locale)}
            </span>
          )}
        </label>
      </div>

      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {moneyErrorText(state.error, i18n.locale)}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/map"
          className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
        >
          {t.cancel}
        </Link>
        <Button type="submit" size="md" disabled={!canSave}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
