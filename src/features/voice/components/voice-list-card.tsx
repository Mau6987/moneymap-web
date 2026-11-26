"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import { cx } from "@/lib/cx";
import { formatAmount } from "@/lib/money/format";

import { registerVoiceMovements } from "../../quick-add/quick-add-action";
import type { VoicePrefill, VoiceReview } from "../domain/voice-review";

import { useMessages } from "@/lib/i18n/client";
import { moneyErrorText } from "@/lib/i18n/money-messages";

/**
 * Como la app: una frase con varios movimientos los muestra en lista, cada uno
 * con su monto, categoría y cuenta. "Corregir" lleva ese a Quick Add y
 * "Confirmar N" guarda juntos los que no tienen nada que completar.
 */
export function VoiceListCard({
  transcript,
  reviews,
  idempotencyKey,
  onCorrect,
  onDiscard,
}: {
  transcript: string | null;
  reviews: VoiceReview[];
  idempotencyKey: string;
  onCorrect: (prefill: VoicePrefill) => void;
  onDiscard: () => void;
}) {
  const i18n = useMessages();
  const t = i18n.voice;
  const [state, action, pending] = useActionState(registerVoiceMovements, {});
  const ready = reviews.filter((r) => r.canConfirm);
  const movements = ready.map((r) => ({
    kind: r.prefill.kind,
    account: r.account!.id,
    category: r.category!.id,
    amount: r.amount!,
    date: r.prefill.date,
    description: r.prefill.description,
  }));

  return (
    <div className="flex flex-col gap-4" data-testid="voice-list">
      <h2 className="text-lg font-extrabold">{t.reviewTitle}</h2>
      {transcript && (
        <blockquote className="glass rounded-[22px] px-[18px] py-3.5 text-[15px] font-semibold">
          “{transcript}”
        </blockquote>
      )}
      <p className="text-muted text-sm">{t.listHint(reviews.length)}</p>
      <ul className="bg-well flex flex-col divide-y divide-[var(--mm-line)] rounded-[22px] px-3.5">
        {reviews.map((r, i) => {
          const expense = r.prefill.kind === "expense";
          const label = r.account?.label ?? r.currency;
          return (
            <li key={i} className="flex items-center gap-3 py-3" data-testid={`voice-item-${i}`}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: r.category?.color ?? "var(--mm-primary)" }}
              />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">
                  {r.prefill.description || r.category?.name || t.missing}
                </b>
                <span className="text-muted text-xs font-semibold">
                  {[r.category?.name, r.account?.name].filter(Boolean).join(" · ") || t.missing}
                </span>
              </span>
              <span
                className={cx(
                  "font-extrabold whitespace-nowrap tabular-nums",
                  !r.amount ? "text-amber-text" : expense ? "text-coral-text" : "text-green-text",
                )}
              >
                {r.amount
                  ? `${expense ? "−" : "+"}${label} ${formatAmount(r.amount, r.account?.decimals ?? 2)}`
                  : t.missingAmount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="!px-2"
                onClick={() => onCorrect(r.prefill)}
              >
                {t.correct}
              </Button>
            </li>
          );
        })}
      </ul>
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {moneyErrorText(state.error, i18n.locale)}
        </p>
      )}
      <form action={action} className="flex flex-wrap justify-end gap-2">
        <input type="hidden" name="voice" value={reviews[0]?.prefill.voiceEntryId ?? ""} />
        <input type="hidden" name="key" value={idempotencyKey} />
        <input type="hidden" name="movements" value={JSON.stringify(movements)} />
        <Button type="button" variant="ghost" size="md" onClick={onDiscard}>
          {t.discard}
        </Button>
        <Button type="submit" size="md" disabled={pending || ready.length === 0}>
          {pending ? t.confirming : t.confirmAll(ready.length)}
        </Button>
      </form>
      <p className="text-muted text-center text-xs">{t.privacy}</p>
    </div>
  );
}
