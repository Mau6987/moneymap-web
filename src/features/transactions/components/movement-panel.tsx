"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { formatNumber } from "@/lib/money/money";

import type { Transaction } from "../../map/data/map-gateway";
import { deleteMovement, updateMovement } from "../transactions-actions";
import { ReceiptBox } from "./receipt-box";

import { useMessages } from "@/lib/i18n/client";
import { moneyErrorText } from "@/lib/i18n/money-messages";

const field =
  "focus-ring bg-field border-line h-11 w-full rounded-[14px] border px-3 text-sm font-semibold";

/**
 * Un gasto o un ingreso abierto desde Movimientos, como el detalle de la app:
 * se corrige el monto, la categoría, la cuenta (de su misma moneda), la fecha
 * y la descripción, o se borra. Las transferencias no se abren.
 */
export function MovementPanel({
  movement,
  accounts,
  categories,
  decimals,
  back,
}: {
  movement: Transaction;
  /** Las cuentas activas de la moneda del movimiento. */
  accounts: { id: string; name: string }[];
  /** Las categorías de su tipo (gasto o ingreso). */
  categories: { id: string; name: string }[];
  decimals: number;
  /** Movimientos con sus filtros, sin el panel abierto. */
  back: string;
}) {
  const i18n = useMessages();
  const t = i18n.transactions.edit;
  const [state, action, pending] = useActionState(updateMovement, {});
  const [confirm, setConfirm] = useState(false);

  return (
    <section
      aria-labelledby="movement-title"
      className="glass flex flex-col gap-4 rounded-[26px] p-4 sm:px-[22px] sm:py-5"
      data-testid="movement-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="movement-title" className="text-[15px] font-extrabold">
          {t.title}
        </h2>
        <Link href={back} className="focus-ring text-primary-text text-sm font-bold">
          {t.cancel}
        </Link>
      </div>
      <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={movement.id} />
        <input type="hidden" name="decimals" value={decimals} />
        <input type="hidden" name="back" value={back} />
        <TextField
          label={`${t.amount} (${movement.currency})`}
          name="amount"
          inputMode="decimal"
          defaultValue={formatNumber(movement.amount, decimals)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-xs font-semibold">{t.category}</span>
          <select name="category" defaultValue={movement.category_id ?? ""} className={field}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-xs font-semibold">{t.account}</span>
          <select name="account" defaultValue={movement.account_id} className={field}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <span className="text-muted text-xs">{t.otherCurrency}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-xs font-semibold">{t.date}</span>
          <input type="date" name="date" defaultValue={movement.occurred_on} className={field} />
        </label>
        <div className="sm:col-span-2">
          <TextField
            label={t.description}
            name="description"
            defaultValue={movement.description}
            maxLength={200}
          />
        </div>
        {state.error && (
          <p
            role="alert"
            className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold sm:col-span-2"
          >
            {moneyErrorText(state.error, i18n.locale)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" size="md" onClick={() => setConfirm(true)}>
            {t.delete}
          </Button>
          <Button type="submit" size="md" disabled={pending}>
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </form>
      {movement.kind === "expense" && <ReceiptBox movement={movement} back={back} />}
      {confirm && (
        <form
          action={deleteMovement}
          role="alertdialog"
          aria-labelledby="movement-delete-title"
          className="bg-coral-soft rounded-[18px] p-4"
        >
          <input type="hidden" name="id" value={movement.id} />
          <input type="hidden" name="back" value={back} />
          <h3 id="movement-delete-title" className="font-extrabold">
            {t.deleteTitle}
          </h3>
          <p className="mt-1 text-sm">{t.deleteBody}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="md" onClick={() => setConfirm(false)}>
              {t.deleteCancel}
            </Button>
            <Button type="submit" variant="danger" size="md">
              {t.deleteConfirm}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
