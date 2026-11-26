"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";
import { goalErrorText } from "@/lib/i18n/goals-messages";
import { formatNumber } from "@/lib/money/money";
import { parseAmount } from "@/lib/money/parse";

import type { AccountChoice } from "../goals-data";
import type { GoalFormState } from "../goals-actions";
import { DEFAULT_PRIORITY, PRIORITIES } from "../domain/goal";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: GoalFormState, form: FormData) => Promise<GoalFormState>;

export interface GoalCurrency {
  code: string;
  name: string;
  label: string;
  decimals: number;
}

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

function ErrorMessage({ code }: { code?: string }) {
  const i18n = useMessages();
  if (!code) return null;
  return (
    <p
      role="alert"
      className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
    >
      {goalErrorText(code, i18n.locale)}
    </p>
  );
}

/**
 * "Nueva meta" o su edición (spec 005, RF-1 y RF-4; mockup "Web-Nueva-Meta").
 * La moneda se elige una vez, solo entre Mis monedas; al editar no se muestra.
 */
export function GoalForm({
  action,
  currencies,
  initial,
}: {
  action: Action;
  /** Mis monedas, la principal primero. Al editar, solo la de la meta. */
  currencies: GoalCurrency[];
  initial?: { id: string; name: string; target: string; date: string; priority: number };
}) {
  const i18n = useMessages();
  const t = i18n.goals;
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? DEFAULT_PRIORITY);
  const [currency, setCurrency] = useState(currencies[0]?.code ?? "");
  const info = currencies.find((c) => c.code === currency) ?? currencies[0];
  const decimals = info?.decimals ?? 2;
  const valid = name.trim().length > 0 && parseAmount(target, { decimals }) !== null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="decimals" value={decimals} />
      <input type="hidden" name="priority" value={priority} />
      <TextField
        label={t.name}
        name="name"
        value={name}
        maxLength={80}
        placeholder={t.nameHint}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label={`${t.target}${info ? ` (${info.label})` : ""}`}
        name="target"
        inputMode="decimal"
        placeholder="0"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      {!initial && (
        <div className="flex flex-col gap-1">
          <label htmlFor="goal-currency" className="text-sm font-bold">
            {t.currency}
          </label>
          <select
            id="goal-currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-describedby="goal-currency-hint"
            className="focus-ring bg-field border-line h-12 rounded-[16px] border px-3 text-sm font-semibold"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
          <span id="goal-currency-hint" className="text-muted text-xs">
            {t.currencyHint}
          </span>
        </div>
      )}
      <TextField
        label={t.dateOptional}
        name="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t.priority}</legend>
        <div role="radiogroup" aria-label={t.priority} className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={priority === p}
              onClick={() => setPriority(p)}
              className={chip(priority === p)}
            >
              {t.priorities[p]}
            </button>
          ))}
        </div>
      </fieldset>
      <ErrorMessage code={state.error} />
      <div className="flex justify-end gap-2">
        <Link
          href={initial ? `/goals?goal=${initial.id}` : "/goals"}
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

/**
 * "Aportar" y "Retirar" de una meta, como en la app (spec 005, RF-20 y RF-21):
 * cada botón abre su panel con el monto, en la moneda de la meta, y la cuenta
 * de donde sale o adonde vuelve, con su saldo. Se registra hoy. No deja
 * aportar más de lo que tiene la cuenta ni retirar más de lo ahorrado.
 */
export function GoalMoney({
  contribute,
  withdraw,
  goalId,
  goalName,
  currency,
  label,
  decimals,
  saved,
  savedText,
  target,
  today,
  keys,
  accounts,
  canContribute,
}: {
  contribute: Action;
  withdraw: Action;
  goalId: string;
  goalName: string;
  currency: string;
  label: string;
  decimals: number;
  /** Lo ahorrado en la meta, como lo manda la API. */
  saved: string;
  savedText: string;
  /** El objetivo, como lo manda la API: un aporte no pasa lo que falta (BUG-049). */
  target: string;
  today: string;
  /** Una clave por acción: un reintento nunca registra dos veces. */
  keys: { contribute: string; withdraw: string };
  accounts: AccountChoice[];
  canContribute: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.goals;
  const [mode, setMode] = useState<"contribute" | "withdraw" | null>(null);
  const canWithdraw = new Decimal(saved).greaterThan(0);
  const toggle = (next: "contribute" | "withdraw") => setMode(mode === next ? null : next);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canContribute && (
          <Button
            type="button"
            size="md"
            aria-expanded={mode === "contribute"}
            onClick={() => toggle("contribute")}
          >
            {t.contribute}
          </Button>
        )}
        {canWithdraw && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            aria-expanded={mode === "withdraw"}
            onClick={() => toggle("withdraw")}
          >
            {t.withdraw}
          </Button>
        )}
      </div>
      {mode && (
        <MoveForm
          key={mode}
          action={mode === "withdraw" ? withdraw : contribute}
          isWithdraw={mode === "withdraw"}
          goalId={goalId}
          title={mode === "withdraw" ? t.withdrawFrom(goalName) : t.contributeTo(goalName)}
          currency={currency}
          label={label}
          decimals={decimals}
          saved={saved}
          savedText={savedText}
          target={target}
          today={today}
          idempotencyKey={mode === "withdraw" ? keys.withdraw : keys.contribute}
          accounts={accounts}
        />
      )}
    </div>
  );
}

function MoveForm({
  action,
  isWithdraw,
  goalId,
  title,
  currency,
  label,
  decimals,
  saved,
  savedText,
  target,
  today,
  idempotencyKey,
  accounts,
}: {
  action: Action;
  isWithdraw: boolean;
  goalId: string;
  title: string;
  currency: string;
  label: string;
  decimals: number;
  saved: string;
  savedText: string;
  target: string;
  today: string;
  idempotencyKey: string;
  accounts: AccountChoice[];
}) {
  const i18n = useMessages();
  const t = i18n.goals;
  const [state, formAction, pending] = useActionState(action, {});
  const [amount, setAmount] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const selected =
    accounts.find((a) => a.id === chosen) ?? accounts.find((a) => a.isDefault) ?? accounts[0];
  const typed = parseAmount(amount, { decimals });
  // BUG-049: lo que le falta a la meta; un aporte no lo pasa.
  const remaining = Decimal.max(new Decimal(target).minus(saved), 0);
  // Retirar: como mucho lo ahorrado. Aportar: como mucho lo que falta y lo
  // que tiene la cuenta.
  const limit =
    typed === null
      ? null
      : isWithdraw
        ? new Decimal(typed).greaterThan(saved)
          ? "goal_insufficient"
          : null
        : new Decimal(typed).greaterThan(remaining)
          ? "contribution_exceeds_remaining"
          : selected && new Decimal(typed).greaterThan(selected.balance)
            ? "account_insufficient"
            : null;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-[22px] border border-[var(--mm-line)] p-4"
      data-testid={isWithdraw ? "goal-withdraw-form" : "goal-contribute-form"}
      noValidate
    >
      <input type="hidden" name="id" value={goalId} />
      <input type="hidden" name="decimals" value={decimals} />
      <input type="hidden" name="key" value={idempotencyKey} />
      <input type="hidden" name="date" value={today} />
      <input type="hidden" name="account" value={selected?.id ?? ""} />
      <div>
        <h3 className="text-[15px] font-extrabold">{title}</h3>
        {isWithdraw ? (
          <p className="text-muted mt-0.5 text-sm">
            {t.withdrawAvailable} <span className="text-ink font-bold">{savedText}</span>
          </p>
        ) : (
          <p className="text-muted mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span>
              {t.contributeRemaining}{" "}
              <span className="text-ink num font-bold" data-testid="goal-remaining">
                {label} {formatNumber(remaining.toFixed(decimals), decimals)}
              </span>
            </span>
            {remaining.greaterThan(0) && (
              <button
                type="button"
                onClick={() => setAmount(formatNumber(remaining.toFixed(decimals), decimals))}
                className="focus-ring text-primary-text rounded-full font-bold"
              >
                {t.contributeComplete}
              </button>
            )}
          </p>
        )}
      </div>
      <TextField
        label={`${t.amount} (${label})`}
        name="amount"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <ErrorMessage code={limit ?? undefined} />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink-2 mb-1 text-[13px] font-bold">
          {isWithdraw ? t.withdrawTo : t.contributeFrom}
        </legend>
        {accounts.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>{t.noAccountIn(currency)}</span>
            <Link href="/accounts" className="focus-ring text-primary-text rounded-full font-bold">
              + {t.newAccount}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <label
                key={a.id}
                className={cx(
                  chip(selected?.id === a.id),
                  "h-auto cursor-pointer flex-col items-start py-2 leading-tight",
                )}
              >
                <input
                  type="radio"
                  name="account-choice"
                  value={a.id}
                  checked={selected?.id === a.id}
                  onChange={() => setChosen(a.id)}
                  className="sr-only"
                />
                <span>{a.name}</span>
                <span className="text-xs font-bold opacity-75">{a.detail}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <ErrorMessage code={state.error} />
      <Button
        type="submit"
        size="md"
        disabled={pending || typed === null || limit !== null || !selected}
      >
        {isWithdraw ? t.withdraw : t.contribute}
      </Button>
    </form>
  );
}
