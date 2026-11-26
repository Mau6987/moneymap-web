"use client";

import { useState } from "react";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { cx } from "@/lib/cx";

import { payRule } from "../recurring-actions";

import { useMessages } from "@/lib/i18n/client";

/** Una cuenta para pagar un fijo: en su moneda, con el saldo ya escrito. */
export interface PayAccount {
  id: string;
  name: string;
  /** El saldo escrito (oculto en modo privado). */
  balance: string;
}

const chip = (on: boolean) =>
  cx(
    "focus-ring flex min-h-10 cursor-pointer flex-col items-start rounded-[16px] px-4 py-1.5 text-left text-sm leading-tight font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

/**
 * Pagar (o cobrar) un fijo, como en la app (BUG-027): al tocarlo pregunta con
 * qué cuenta de su moneda, con el saldo de cada una, y recién ahí lo registra.
 * Arranca en la cuenta del fijo, si la tiene.
 */
export function PayForm({
  ruleId,
  kind,
  label,
  accounts,
  defaultAccount,
  idempotencyKey,
  back,
  currency,
  compact = false,
}: {
  ruleId: string;
  kind: "income" | "expenses";
  /** "Marcar como pagado", "Pagar"… */
  label: string;
  accounts: PayAccount[];
  defaultAccount?: string | null;
  idempotencyKey: string;
  /** A dónde vuelve; sin él, a Fijos. */
  back?: "/map";
  currency?: string;
  /** En el Map, el botón chico de la fila. */
  compact?: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.recurring;
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(
    accounts.find((a) => a.id === defaultAccount)?.id ?? accounts[0]?.id ?? "",
  );
  const income = kind === "income";

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="md"
        className={compact ? "!h-9 !px-4" : undefined}
        onClick={() => setOpen(true)}
      >
        {!compact && <Icon name="check" className="size-4" />}
        {label}
      </Button>
    );
  }

  return (
    <form
      action={payRule}
      className="bg-well flex w-full basis-full flex-col gap-3 rounded-[18px] p-3"
      data-testid={`pay-${ruleId}`}
    >
      <input type="hidden" name="id" value={ruleId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="key" value={idempotencyKey} />
      <input type="hidden" name="account" value={account} />
      {back && <input type="hidden" name="back" value={back} />}
      {currency && <input type="hidden" name="currency" value={currency} />}
      <fieldset>
        <legend className="mb-2 text-sm font-extrabold">{income ? t.receiveIn : t.payWith}</legend>
        {accounts.length === 0 ? (
          <p className="text-muted text-sm">{t.noPayAccount}</p>
        ) : (
          <div
            role="radiogroup"
            aria-label={income ? t.receiveIn : t.payWith}
            className="flex flex-wrap gap-2"
          >
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={a.id === account}
                onClick={() => setAccount(a.id)}
                className={chip(a.id === account)}
              >
                <span>{a.name}</span>
                <span className="text-xs font-bold opacity-75">{a.balance}</span>
              </button>
            ))}
          </div>
        )}
      </fieldset>
      <p className="text-muted text-xs">{t.payBody}</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Ya se pagó por fuera de la app: pasa al siguiente sin registrar nada. */}
        <Button
          type="submit"
          name="intent"
          value="skip"
          variant="ghost"
          size="md"
          className="mr-auto"
          title={t.skipBody}
        >
          {income ? t.skipIncome : t.skip}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
        <Button type="submit" size="md" disabled={!account}>
          {t.payConfirm}
        </Button>
      </div>
    </form>
  );
}
