"use client";

import { AccountChipText } from "@/components/account-chip-text";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/button";
import { cx } from "@/lib/cx";
import { transferErrorText } from "@/lib/i18n/transfer-messages";
import { parseAmount } from "@/lib/money/parse";

import { destinationsOf, originOf, type TransferAccount } from "../domain/transfer";
import type { TransferState } from "../transfer-action";

import { useMessages } from "@/lib/i18n/client";
interface TransferFormProps {
  action: (state: TransferState, form: FormData) => Promise<TransferState>;
  accounts: TransferAccount[];
  today: string;
  /** La misma para cada intento: un reintento no mueve el dinero dos veces. */
  idempotencyKey: string;
}

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-left text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

function AccountChoice({
  label,
  accounts,
  selected,
  onSelect,
}: {
  label: string;
  accounts: TransferAccount[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-muted mb-2 text-xs font-bold">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={a.id === selected}
            onClick={() => onSelect(a.id)}
            className={chip(a.id === selected)}
          >
            <AccountChipText name={a.name} currency={a.currency} balance={a.balance} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * "Transferir" (spec 002, RF-7): de una cuenta a otra de la misma moneda. Al
 * cambiar el origen a otra moneda, el destino elegido ya no vale y se borra.
 */
export function TransferForm({ action, accounts, today, idempotencyKey }: TransferFormProps) {
  const i18n = useMessages();
  const t = i18n.transfer;
  const [state, formAction, pending] = useActionState(action, {});
  const [fromId, setFromId] = useState<string | undefined>();
  const [toId, setToId] = useState<string | undefined>();
  // Controlados: si guardar falla, lo escrito se queda (RF-16).
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");

  const from = originOf(accounts, fromId);
  if (!from) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm font-semibold">{t.noAccounts}</p>
        <ButtonLink href="/accounts" size="md">
          {t.createAccount}
        </ButtonLink>
      </div>
    );
  }

  const destinations = destinationsOf(accounts, from);
  const to = destinations.find((a) => a.id === toId);
  const valid = parseAmount(amount, { decimals: from.decimals }) !== null;
  const canSave = valid && to !== undefined && !pending;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="from" value={from.id} />
      <input type="hidden" name="to" value={to?.id ?? ""} />
      <input type="hidden" name="decimals" value={from.decimals} />
      <input type="hidden" name="key" value={idempotencyKey} />

      <AccountChoice
        label={t.from}
        accounts={accounts}
        selected={from.id}
        onSelect={(id) => {
          setFromId(id);
          setToId(undefined);
        }}
      />

      {destinations.length > 0 ? (
        <AccountChoice label={t.to} accounts={destinations} selected={to?.id} onSelect={setToId} />
      ) : (
        <div className="bg-well flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-4 py-3">
          <p className="text-sm font-bold">{t.noDestination(from.currency)}</p>
          <ButtonLink href="/accounts" size="md" variant="secondary">
            {t.createAccount}
          </ButtonLink>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="transfer-amount" className="text-muted text-xs font-bold">
          {t.amount}
        </label>
        <span className="flex items-center gap-3">
          <span className="text-muted text-2xl font-extrabold">{from.label}</span>
          <input
            id="transfer-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="focus-ring min-w-0 flex-1 bg-transparent text-[44px] font-extrabold tracking-[-0.03em] tabular-nums outline-none"
          />
          <span className="bg-well rounded-full px-3 py-1 text-xs font-extrabold">
            {from.currency}
          </span>
        </span>
      </div>

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
            className="focus-ring bg-field border-line h-11 rounded-[14px] border px-3 text-sm font-semibold"
          />
        </label>
      </div>

      <p className="text-muted text-xs font-semibold">{t.note}</p>

      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {transferErrorText(state.error, i18n.locale)}
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
