"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";

import { resetErrorText } from "@/lib/i18n/reset-messages";

import { MIN_PASSWORD_LENGTH, passwordsMatch } from "../domain/register-validation";
import type { ResetResult } from "../password-reset-actions";
import { PasswordStrengthBar } from "./password-strength-bar";
import { StepHeader } from "./step-header";

import { useMessages } from "@/lib/i18n/client";
interface NewPasswordStepProps {
  save: (password: string) => Promise<ResetResult>;
  onSaved: () => void;
  /** La API rechazó el código al guardar: hay que volver a pedirlo (RF-3). */
  onCodeRejected: () => void;
}

/**
 * "Crea tu nueva contraseña" (spec 009, RF-5 y RF-6; Web 03h). También la usa
 * el cambio de contraseña de Ajustes → Seguridad.
 */
export function NewPasswordStep({ save, onSaved, onCodeRejected }: NewPasswordStepProps) {
  const i18n = useMessages();
  const t = i18n.reset.password;
  const data = i18n.register.data;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const matches = passwordsMatch(password, confirm);
  const shortPassword = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSave = password.length >= MIN_PASSWORD_LENGTH && matches && !pending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setPending(true);
    const result = await save(password);
    setPending(false);
    if (!result.error) return onSaved();
    if (result.error === "invalid_reset_code") return onCodeRejected();
    setError(resetErrorText(result.error, i18n.locale));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <StepHeader icon="lock" title={t.title} subtitle={t.subtitle} />
      <TextField
        label={t.label}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={shortPassword ? data.passwordShort(MIN_PASSWORD_LENGTH) : undefined}
      />
      <PasswordStrengthBar password={password} />
      <TextField
        label={data.confirm}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={confirm.length > 0 && !matches ? data.noMatch : undefined}
        hint={matches ? <span className="text-green-text">{data.match}</span> : undefined}
      />
      {error && (
        <p role="alert" className="text-coral-text text-[13px] font-bold">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSave} className="mt-2">
        {pending ? t.saving : t.save}
      </Button>
    </form>
  );
}
