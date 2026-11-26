"use client";

import { useActionState } from "react";

import { Button, ButtonLink } from "@/components/button";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";
import { moneyErrorText } from "@/lib/i18n/money-messages";

import { formatNumber } from "@/lib/money/money";

import type { QuickAddState } from "../../quick-add/quick-add-action";
import type { VoicePrefill, VoiceReview } from "../domain/voice-review";

import { useMessages } from "@/lib/i18n/client";
interface VoiceReviewCardProps {
  transcript: string | null;
  review: VoiceReview;
  today: string;
  idempotencyKey: string;
  confirmAction: (state: QuickAddState, form: FormData) => Promise<QuickAddState>;
  onCorrect: (prefill: VoicePrefill) => void;
  onDiscard: () => void;
}

/** Una de las casillas del mockup (CATEGORÍA, CUENTA, FECHA). */
function Tile({ label, value }: { label: string; value?: string }) {
  const i18n = useMessages();
  const t = i18n.voice;
  return (
    <div className="bg-well flex min-w-0 flex-col gap-1.5 rounded-[20px] px-3.5 py-3">
      <small className="text-muted text-[10px] font-extrabold tracking-[0.06em] uppercase">
        {label}
      </small>
      <span className={cx("truncate text-sm font-extrabold", !value && "text-amber-text")}>
        {value ?? t.missing}
      </span>
    </div>
  );
}

/**
 * "Revisa y confirma" (mockup "Web-Voz-Confirmar"): el movimiento entendido,
 * para guardarlo con un toque o corregirlo en Quick Add.
 */
export function VoiceReviewCard({
  transcript,
  review,
  today,
  idempotencyKey,
  confirmAction,
  onCorrect,
  onDiscard,
}: VoiceReviewCardProps) {
  const i18n = useMessages();
  const t = i18n.voice;
  const q = i18n.quickAdd;
  const [state, formAction, pending] = useActionState(confirmAction, {});
  const { prefill, account, category, missing } = review;
  const expense = prefill.kind === "expense";
  const label = account?.label ?? review.currency;
  const amount =
    review.amount && !missing.has("amount")
      ? `${expense ? "−" : "+"}${label} ${formatNumber(review.amount, account?.decimals ?? 2, true)}`
      : null;
  const date = prefill.date === today ? t.today : shortDate(prefill.date, i18n.locale);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold">{t.reviewTitle}</h2>
      {transcript && (
        <p className="bg-well text-muted rounded-[20px] px-3.5 py-3 text-[13px] font-medium">
          “{transcript}”
        </p>
      )}

      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <span className="text-[15px] font-extrabold">
          {prefill.description || category?.name || t.reviewTitle}
        </span>
        <span
          className={cx(
            "text-[40px] font-extrabold tracking-[-0.03em] tabular-nums",
            !amount ? "text-amber-text text-xl" : expense ? "text-coral-text" : "text-green-text",
          )}
        >
          {amount ?? t.missingAmount}
        </span>
        {!missing.has("kind") && (
          <span
            className={cx(
              "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
              expense ? "bg-coral-soft text-coral-text" : "bg-green-soft text-green-text",
            )}
          >
            {expense ? q.expense : q.income}
          </span>
        )}
      </div>

      {review.currencyWithoutAccount && (
        <div className="bg-amber-soft flex flex-col gap-3 rounded-[22px] p-4">
          <p className="text-sm font-bold">{t.noAccountIn(review.currencyWithoutAccount)}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/accounts" size="md" variant="secondary">
              {t.createAccount}
            </ButtonLink>
            <Button
              size="md"
              variant="secondary"
              onClick={() => onCorrect({ ...prefill, amount: "", accountId: undefined })}
            >
              {t.otherAccount}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tile label={t.category} value={missing.has("category") ? undefined : category?.name} />
        <Tile label={t.account} value={account?.name} />
        <Tile label={t.date} value={date} />
      </div>

      <p className="text-muted text-center text-[11px] font-medium">{t.privacy}</p>

      {!review.canConfirm && !review.currencyWithoutAccount && (
        <p className="bg-amber-soft text-amber-text rounded-2xl px-4 py-3 text-sm font-bold">
          {t.incomplete}
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {moneyErrorText(state.error, i18n.locale)}
        </p>
      )}

      <form action={formAction} className="flex flex-wrap justify-end gap-2">
        <input type="hidden" name="kind" value={prefill.kind} />
        <input type="hidden" name="account" value={account?.id ?? ""} />
        <input type="hidden" name="category" value={prefill.categoryId ?? ""} />
        <input type="hidden" name="decimals" value={account?.decimals ?? 2} />
        <input type="hidden" name="amount" value={prefill.amount} />
        <input type="hidden" name="date" value={prefill.date} />
        <input type="hidden" name="description" value={prefill.description} />
        <input type="hidden" name="key" value={idempotencyKey} />
        <input type="hidden" name="voice" value={prefill.voiceEntryId} />
        <Button variant="ghost" size="md" onClick={onDiscard} disabled={pending}>
          {t.discard}
        </Button>
        <Button variant="secondary" size="md" onClick={() => onCorrect(prefill)} disabled={pending}>
          {t.correct}
        </Button>
        <Button type="submit" size="md" disabled={!review.canConfirm || pending}>
          {pending ? t.confirming : t.confirm}
        </Button>
      </form>
    </div>
  );
}
