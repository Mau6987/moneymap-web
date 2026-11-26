"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Toast } from "@/components/toast";
import { resetErrorText } from "@/lib/i18n/reset-messages";

import { RESET_CODE_MINUTES, RESET_CODE_PATTERN, RESET_RESEND_SECONDS } from "../domain/reset-code";
import type { ResetResult } from "../password-reset-actions";
import { StepHeader } from "./step-header";
import { useMessages } from "@/lib/i18n/client";
const TOAST_MS = 3000;

interface ResetCodeStepProps {
  email: string;
  verifyCode: (email: string, code: string) => Promise<ResetResult>;
  requestCode: (email: string) => Promise<ResetResult>;
  onVerified: (code: string) => void;
  onChangeEmail: () => void;
  /** Llega con el error de un código que la API rechazó al guardar (RF-3). */
  initialError?: string;
  /** Muestra el código de prueba en modo demo. */
  demo?: boolean;
  now?: () => number;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** "Revisa tu correo" con el código de 6 dígitos (spec 009, RF-3 a RF-5; Web 03g). */
export function ResetCodeStep({ now = Date.now, ...props }: ResetCodeStepProps) {
  const i18n = useMessages();
  const t = i18n.reset.code;
  const [sentAt, setSentAt] = useState(now);
  const [time, setTime] = useState(now);
  const [code, setCode] = useState("");
  const [error, setError] = useState(props.initialError);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(now()), 1000);
    return () => clearInterval(timer);
  }, [now]);

  const elapsed = Math.floor((time - sentAt) / 1000);
  const validFor = Math.max(0, RESET_CODE_MINUTES * 60 - elapsed);
  const resendWait = Math.max(0, RESET_RESEND_SECONDS - elapsed);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!RESET_CODE_PATTERN.test(code) || pending) return;
    setPending(true);
    const result = await props.verifyCode(props.email, code);
    setPending(false);
    if (!result.error) return props.onVerified(code);
    // RF-3: con un código malo, el campo queda vacío y el botón deshabilitado.
    if (result.error === "invalid_reset_code") setCode("");
    setError(
      result.error === "invalid_reset_code" ? t.invalid : resetErrorText(result.error, i18n.locale),
    );
  }

  async function resend() {
    setPending(true);
    const result = await props.requestCode(props.email);
    setPending(false);
    if (result.error) return setError(resetErrorText(result.error, i18n.locale));
    setSentAt(now());
    setTime(now());
    setError(undefined);
    setToast(true);
    setTimeout(() => setToast(false), TOAST_MS);
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-3" noValidate>
      <StepHeader icon="mail" title={t.title} subtitle={t.subtitle(RESET_CODE_MINUTES)}>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="bg-field rounded-full px-3.5 py-1.5 text-sm font-bold">
            {props.email}
          </span>
          <span
            className="bg-field num rounded-full px-3.5 py-1.5 text-sm font-bold"
            aria-label={t.timeLeft}
          >
            {clock(validFor)}
          </span>
        </div>
      </StepHeader>
      {props.demo && <p className="text-amber-text text-center text-xs font-bold">{t.demo}</p>}
      <TextField
        label={t.label}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder={t.placeholder}
        value={code}
        error={error}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
          setError(undefined);
        }}
      />
      <Button type="submit" disabled={!RESET_CODE_PATTERN.test(code) || pending} className="mt-2">
        {pending ? t.verifying : t.verify}
      </Button>
      <Button variant="secondary" disabled={pending || resendWait > 0} onClick={resend}>
        {resendWait > 0 ? t.resendIn(clock(resendWait)) : t.resend}
      </Button>
      <Button variant="ghost" size="md" onClick={props.onChangeEmail}>
        {t.changeEmail}
      </Button>
      {toast && <Toast>{t.resent}</Toast>}
    </form>
  );
}
