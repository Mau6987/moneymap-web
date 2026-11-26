"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { resetErrorText } from "@/lib/i18n/reset-messages";

import { isValidEmail } from "../domain/email";
import type { ResetResult } from "../password-reset-actions";
import { StepHeader } from "./step-header";

import { useMessages } from "@/lib/i18n/client";
interface ResetEmailStepProps {
  initialEmail: string;
  requestCode: (email: string) => Promise<ResetResult>;
  onSent: (email: string) => void;
}

/** "¿Olvidaste tu contraseña?" (spec 009, RF-1 y RF-2; mockup Web 03f). */
export function ResetEmailStep({ initialEmail, requestCode, onSent }: ResetEmailStepProps) {
  const i18n = useMessages();
  const t = i18n.reset.email;
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const valid = isValidEmail(email);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    const result = await requestCode(email);
    setPending(false);
    if (result.error) return setError(resetErrorText(result.error, i18n.locale));
    onSent(email.trim());
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <StepHeader icon="lock" title={t.title} subtitle={t.subtitle} />
      <TextField
        label={t.label}
        icon="mail"
        type="email"
        autoComplete="email"
        value={email}
        error={error}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(undefined);
        }}
      />
      <Button type="submit" disabled={!valid || pending} className="mt-2">
        {pending ? t.sending : t.send}
      </Button>
      <Link href="/login" className="focus-ring text-primary-text text-center text-sm font-bold">
        {t.backToLogin}
      </Link>
    </form>
  );
}
