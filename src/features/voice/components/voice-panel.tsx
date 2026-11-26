"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { cx } from "@/lib/cx";
import { voiceErrorText } from "@/lib/i18n/voice-messages";

import type { QuickAddState } from "../../quick-add/quick-add-action";
import {
  isProcessing,
  reviewOf,
  reviewsOf,
  type VoiceAccount,
  type VoiceCategory,
  type VoiceEntry,
  type VoicePrefill,
} from "../domain/voice-review";
import {
  discardVoiceEntry,
  startVoiceEntry,
  voiceEntryStatus,
  type VoiceResult,
} from "../voice-actions";
import { useRecorder } from "./use-recorder";
import { VoiceListCard } from "./voice-list-card";
import { VoiceReviewCard } from "./voice-review-card";

import { useMessages } from "@/lib/i18n/client";
/** Cada cuánto se pregunta cómo va el dictado. */
export const POLL_INTERVAL_MS = 1000;

/**
 * Lo que se espera a que el trabajador termine, como la app. El back cierra
 * un dictado trabado por su cuenta; esto evita que la pantalla espere de más.
 */
export const MAX_WAIT_MS = 90_000;

/** Una llamada que no responde en este tiempo cuenta como fallida (BUG-045). */
export const REQUEST_TIMEOUT_MS = 20_000;

/** El límite de la API (spec 012 del back, RF-1). */
const MAX_RECORDING_MS = 60_000;

type Phase = "idle" | "recording" | "processing";

interface VoicePanelProps {
  accounts: VoiceAccount[];
  categories: VoiceCategory[];
  today: string;
  idempotencyKey: string;
  confirmAction: (state: QuickAddState, form: FormData) => Promise<QuickAddState>;
  /** "Corregir": lleva lo entendido a Quick Add. */
  onCorrect: (prefill: VoicePrefill) => void;
  /** "2 de 10 dictados usados este mes", como la app. */
  quota?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** La respuesta de la API o, si tarda de más, el error de tiempo agotado. */
function withTimeout<T>(call: Promise<T>): Promise<T | { error: string }> {
  return Promise.race([call, wait(REQUEST_TIMEOUT_MS).then(() => ({ error: "voice_timeout" }))]);
}

/**
 * "Dictar" (mockup "Web-Voz"): la frase, dicha o escrita, va a la API y,
 * cuando se entiende, se revisa antes de guardar.
 */
export function VoicePanel({
  accounts,
  categories,
  today,
  idempotencyKey,
  confirmAction,
  onCorrect,
  quota,
}: VoicePanelProps) {
  const i18n = useMessages();
  const t = i18n.voice;
  const recorder = useRecorder();
  const [phase, setPhase] = useState<Phase>("idle");
  const [entry, setEntry] = useState<VoiceEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const alive = useRef(true);
  /** Sube con cada envío: un dictado cancelado no pisa la pantalla al terminar. */
  const run = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (limit.current) clearTimeout(limit.current);
    };
  }, []);

  async function process(form: FormData) {
    const current = ++run.current;
    const active = () => alive.current && run.current === current;
    setPhase("processing");
    setError(null);
    const deadline = Date.now() + MAX_WAIT_MS;
    let result: VoiceResult;
    // BUG-045: si una llamada falla o no responde, la pantalla no se queda en
    // "Entendiendo lo que dijiste…": dice qué pasó y deja volver a intentar.
    try {
      result = await withTimeout(startVoiceEntry(form));
      while (result.entry && isProcessing(result.entry.status)) {
        if (!active()) return;
        setEntry(result.entry);
        pending.current = result.entry.id;
        if (Date.now() >= deadline) {
          result = { error: "voice_timeout" };
          break;
        }
        await wait(POLL_INTERVAL_MS);
        if (!active()) return;
        result = await withTimeout(voiceEntryStatus(result.entry.id));
      }
    } catch {
      result = { error: "voice_failed" };
    }
    if (!active()) return;
    pending.current = null;
    setPhase("idle");
    if (result.error || result.entry?.status !== "extracted") {
      setEntry(null);
      setError(result.error ?? "voice_failed");
      return;
    }
    setEntry(result.entry);
  }

  /** El dictado pendiente, para descartarlo si el usuario cancela. */
  const pending = useRef<string | null>(null);

  /** El usuario ya no quiere esperar: deja de preguntar y descarta el dictado. */
  function cancel() {
    run.current += 1;
    if (pending.current) void discardVoiceEntry(pending.current);
    pending.current = null;
    setEntry(null);
    setPhase("idle");
  }

  async function stopAndSend() {
    if (limit.current) clearTimeout(limit.current);
    const audio = await recorder.stop();
    const form = new FormData();
    form.set("audio", audio);
    await process(form);
  }

  async function toggle() {
    if (phase === "recording") return stopAndSend();
    setError(null);
    if (!(await recorder.start())) return setError("mic_denied");
    setPhase("recording");
    limit.current = setTimeout(() => void stopAndSend(), MAX_RECORDING_MS);
  }

  async function send() {
    if (!text.trim() || phase === "processing") return;
    if (phase === "recording") {
      if (limit.current) clearTimeout(limit.current);
      recorder.cancel();
    }
    const form = new FormData();
    form.set("text", text);
    await process(form);
  }

  if (entry?.status === "extracted") {
    const reviews = reviewsOf(entry, accounts, categories, today);
    const discard = () => {
      void discardVoiceEntry(entry.id);
      setEntry(null);
      setText("");
    };
    // Como la app: varios movimientos en la frase van en lista.
    if (reviews.length > 1) {
      return (
        <VoiceListCard
          transcript={entry.transcript}
          reviews={reviews}
          idempotencyKey={idempotencyKey}
          onCorrect={onCorrect}
          onDiscard={discard}
        />
      );
    }
    const review = reviewOf(entry, accounts, categories, today);
    return (
      <VoiceReviewCard
        transcript={entry.transcript}
        review={review}
        today={today}
        idempotencyKey={idempotencyKey}
        confirmAction={confirmAction}
        onCorrect={onCorrect}
        onDiscard={() => {
          void discardVoiceEntry(entry.id);
          setEntry(null);
          setText("");
        }}
      />
    );
  }

  const recording = phase === "recording";
  const status =
    phase === "recording" ? t.listening : phase === "processing" ? t.processing : t.hint;

  return (
    <div className="flex flex-col items-center gap-5">
      <span
        className={cx(
          "grid size-28 place-items-center rounded-full",
          recording ? "bg-coral-soft" : "bg-primary-soft",
        )}
      >
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={phase === "processing"}
          aria-label={recording ? t.stop : t.start}
          className={cx(
            "focus-ring grid size-[84px] place-items-center rounded-full text-white disabled:opacity-40",
            recording ? "bg-[#b5422b]" : "bg-primary",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-8 fill-none stroke-current stroke-[1.9]"
          >
            {recording ? (
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              <>
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
              </>
            )}
          </svg>
        </button>
      </span>
      <p aria-live="polite" className="text-muted text-center text-sm font-semibold">
        {status}
      </p>
      {quota && (
        <p className="text-muted text-xs font-bold" data-testid="voice-quota">
          {quota}
        </p>
      )}
      {phase === "processing" && (
        <Button type="button" variant="secondary" size="md" onClick={cancel}>
          {t.cancel}
        </Button>
      )}
      {entry?.transcript && (
        <blockquote className="glass rounded-[22px] px-[18px] py-3.5 text-[15px] font-semibold">
          “{entry.transcript}”
        </blockquote>
      )}
      {error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text w-full rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {voiceErrorText(error, i18n.locale)}
        </p>
      )}
      <form
        className="flex w-full flex-col gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label htmlFor="voice-text" className="text-muted text-xs font-bold">
          {t.writeInstead}
        </label>
        <span className="flex gap-2">
          <input
            id="voice-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
            placeholder={t.writeHint}
            disabled={phase === "processing"}
            className="focus-ring bg-field border-line h-11 min-w-0 flex-1 rounded-[14px] border px-3 text-sm font-semibold"
          />
          <Button type="submit" size="md" disabled={!text.trim() || phase === "processing"}>
            {t.send}
          </Button>
        </span>
      </form>
    </div>
  );
}
