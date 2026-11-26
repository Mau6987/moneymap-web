"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import { useMessages } from "@/lib/i18n/client";
import { moneyErrorText } from "@/lib/i18n/money-messages";

import type { Transaction } from "../../map/data/map-gateway";
import { attachReceipt, removeReceipt } from "../transactions-actions";

/**
 * Spec 014 del back: la foto del comprobante de un gasto, como en la app. Se
 * ve, se abre en grande, se cambia o se quita. La imagen la sirve
 * `/transactions/{id}/receipt` con la sesión.
 */
export function ReceiptBox({ movement, back }: { movement: Transaction; back: string }) {
  const i18n = useMessages();
  const t = i18n.transactions.edit;
  const [state, action, pending] = useActionState(attachReceipt, {});
  const src = `/transactions/${movement.id}/receipt`;

  return (
    <div className="bg-well flex flex-col gap-3 rounded-[18px] p-3" data-testid="receipt-box">
      <h3 className="text-sm font-extrabold">{t.receiptTitle}</h3>
      {movement.has_receipt && (
        <a
          href={src}
          target="_blank"
          rel="noopener"
          className="focus-ring block w-fit rounded-xl"
          title={t.receiptOpen}
        >
          {/* La foto viene de la API con la sesión: next/image no la puede optimizar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={t.receiptAlt} className="max-h-48 rounded-xl object-contain" />
        </a>
      )}
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={movement.id} />
        <input type="hidden" name="back" value={back} />
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-label={t.receiptPick}
          className="focus-ring file:bg-field file:border-line min-w-0 flex-1 text-sm file:mr-3 file:rounded-xl file:border file:px-3 file:py-2 file:font-bold"
        />
        <Button type="submit" variant="secondary" size="md" disabled={pending}>
          {pending ? t.saving : movement.has_receipt ? t.receiptReplace : t.receiptUpload}
        </Button>
      </form>
      <p className="text-muted text-xs">{t.receiptHint}</p>
      {movement.has_receipt && (
        <form action={removeReceipt}>
          <input type="hidden" name="id" value={movement.id} />
          <input type="hidden" name="back" value={back} />
          <Button type="submit" variant="ghost" size="md">
            {t.receiptRemove}
          </Button>
        </form>
      )}
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {moneyErrorText(state.error, i18n.locale)}
        </p>
      )}
    </div>
  );
}
