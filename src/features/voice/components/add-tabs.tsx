"use client";

import Link from "next/link";
import { useState } from "react";

import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";

import {
  QuickAddForm,
  type QuickAddAccount,
  type QuickAddCategory,
} from "@/features/quick-add/components/quick-add-form";
import type { QuickAddState } from "@/features/quick-add/quick-add-action";
import { cx } from "@/lib/cx";

import type { VoicePrefill } from "../domain/voice-review";
import { VoicePanel } from "./voice-panel";

import { useMessages } from "@/lib/i18n/client";
type Tab = "write" | "dictate";

interface AddTabsProps {
  action: (state: QuickAddState, form: FormData) => Promise<QuickAddState>;
  accounts: QuickAddAccount[];
  categories: QuickAddCategory[];
  today: string;
  idempotencyKey: string;
  /** La voz en el plan: si la incluye y cuántos dictados lleva el mes; null si no se supo. */
  voice?: { enabled: boolean; used: number | null; limit: number | null } | null;
}

/** Los botones redondos de la barra, como los de la app. */
const roundButton =
  "focus-ring glass grid size-11 shrink-0 place-items-center rounded-full text-ink";

/**
 * "Registrar movimiento" con sus formas (mockup "Web-Voz"): escribirlo en
 * Quick Add o dictarlo. "Corregir" un dictado vuelve a Quick Add con lo
 * entendido ya cargado. BUG-033: como en la app, el micrófono y Transferir
 * son botones redondos junto al título, no pestañas con texto.
 */
export function AddTabs({
  action,
  accounts,
  categories,
  today,
  idempotencyKey,
  voice,
}: AddTabsProps) {
  const i18n = useMessages();
  const t = i18n.voice;
  const [tab, setTab] = useState<Tab>("write");
  const dictating = tab === "dictate";
  const [seed, setSeed] = useState<VoicePrefill | undefined>();
  // Cada "Corregir" arma el formulario de cero con lo entendido.
  const [round, setRound] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {i18n.quickAdd.title}
        </h1>
        <div className="flex gap-2">
          {accounts.length > 0 && (
            <button
              type="button"
              aria-pressed={dictating}
              aria-label={dictating ? t.write : t.dictate}
              title={dictating ? t.write : t.dictate}
              onClick={() => setTab(dictating ? "write" : "dictate")}
              className={cx(roundButton, dictating && "!bg-primary !border-transparent text-white")}
            >
              <Icon name={dictating ? "edit" : "mic"} />
            </button>
          )}
          {/* Spec 002, RF-7: las transferencias tienen su pantalla, como en la app. */}
          <Link
            href="/transfer"
            aria-label={i18n.transfer.title}
            title={i18n.transfer.title}
            className={roundButton}
          >
            <Icon name="transfer" />
          </Link>
        </div>
      </header>
      <GlassCard>
        {tab === "write" ? (
          <QuickAddForm
            key={round}
            action={action}
            accounts={accounts}
            categories={categories}
            today={today}
            idempotencyKey={idempotencyKey}
            initial={seed}
          />
        ) : voice && !voice.enabled ? (
          // Como la app: en el plan gratuito, la voz invita a los planes pagos.
          <div
            className="flex flex-col items-center gap-3 py-6 text-center"
            data-testid="voice-not-in-plan"
          >
            <h2 className="text-lg font-extrabold">{t.notInPlanTitle}</h2>
            <p className="text-muted max-w-sm text-sm">{t.notInPlanBody}</p>
            <Link
              href="/plans"
              className="focus-ring bg-primary inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-white"
            >
              {t.seePlans}
            </Link>
          </div>
        ) : (
          <VoicePanel
            quota={
              voice?.limit != null && voice.used != null
                ? t.quota(voice.used, voice.limit)
                : undefined
            }
            accounts={accounts}
            categories={categories}
            today={today}
            idempotencyKey={idempotencyKey}
            confirmAction={action}
            onCorrect={(prefill) => {
              setSeed(prefill);
              setRound((r) => r + 1);
              setTab("write");
            }}
          />
        )}
      </GlassCard>
    </div>
  );
}
