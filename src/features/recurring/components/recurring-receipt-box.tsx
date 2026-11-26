"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import { useMessages } from "@/lib/i18n/client";
import { moneyErrorText } from "@/lib/i18n/money-messages";

import type { RecurringRule } from "../data/recurring-gateway";
import { attachRecurringReceipt, removeRecurringReceipt } from "../recurring-actions";

/**
 * La foto del comprobante de un gasto fijo, como en la app.
 */
export function RecurringReceiptBox({ rule, kind }: { rule: RecurringRule; kind: string }) {
  const i18n = useMessages();
  const t = i18n.transactions.edit;
  const [state, action, pending] = useActionState(attachRecurringReceipt, {});
  const src = `/recurring/${rule.id}/receipt`;
  const hasReceipt = Boolean((rule as any).has_receipt);

  return (
    <div className="bg-well flex flex-col gap-3 rounded-[18px] p-3" data-testid="recurring-receipt-box">
      <h3 className="text-sm font-extrabold">{t.receiptTitle}</h3>
      {hasReceipt && (
        <a
          href={src}
          target="_blank"
          rel="noopener"
          className="focus-ring block w-fit rounded-xl"
          title={t.receiptOpen}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={t.receiptAlt} className="max-h-48 rounded-xl object-contain" />
        </a>
      )}
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={rule.id} />
        <input type="hidden" name="kind" value={kind} />
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-label={t.receiptPick}
          className="focus-ring file:bg-field file:border-line min-w-0 flex-1 text-sm file:mr-3 file:rounded-xl file:border file:px-3 file:py-2 file:font-bold"
        />
        <Button type="submit" variant="secondary" size="md" disabled={pending}>
          {pending ? t.saving : hasReceipt ? t.receiptReplace : t.receiptUpload}
        </Button>
      </form>
      <p className="text-muted text-xs">{t.receiptHint}</p>
      {hasReceipt && (
        <form action={removeRecurringReceipt}>
          <input type="hidden" name="id" value={rule.id} />
          <input type="hidden" name="kind" value={kind} />
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

