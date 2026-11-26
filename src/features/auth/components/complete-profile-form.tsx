"use client";

import { useActionState, useState } from "react";

import { Button, ButtonLink } from "@/components/button";
import { TextField } from "@/components/text-field";
import { authErrorText } from "@/lib/i18n/auth-messages";

import { REGISTRATION_EXPIRED } from "../domain/google";
import type { GoogleState } from "../google-actions";

import { useMessages } from "@/lib/i18n/client";
/**
 * "Completa tu perfil" (spec 001, RF-7 y RF-8): lo que Google no dio. El
 * correo ya está verificado por Google; si Google no lo compartió, se pide.
 * Sin nombre, apellido y términos, "Crear cuenta" queda deshabilitado.
 */
export function CompleteProfileForm({
  action,
  email,
  firstName,
  lastName,
}: {
  action: (state: GoogleState, form: FormData) => Promise<GoogleState>;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const i18n = useMessages();
  const t = i18n.auth.completeProfile;
  const [state, submit, pending] = useActionState(action, {});
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [terms, setTerms] = useState(false);
  const canSubmit = first.trim() !== "" && last.trim() !== "" && terms && !pending;

  return (
    <form action={submit} className="flex flex-col gap-3" noValidate>
      {email && (
        <span className="bg-green-soft text-green-text self-start rounded-full px-3 py-1 text-xs font-extrabold">
          {t.verified(email)}
        </span>
      )}
      <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">{t.title}</h2>
      <p className="text-muted text-sm font-medium">{t.subtitle}</p>
      {!email && <TextField label={t.email} name="email" type="email" autoComplete="email" />}
      <TextField
        label={t.firstName}
        name="first_name"
        autoComplete="given-name"
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        maxLength={80}
      />
      <TextField
        label={t.lastName}
        name="last_name"
        autoComplete="family-name"
        value={last}
        onChange={(e) => setLast(e.target.value)}
        maxLength={80}
      />
      <label className="mt-1 flex items-center gap-2.5 text-[13px] font-semibold">
        <input
          type="checkbox"
          name="terms"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="accent-primary size-5"
        />
        {t.terms}
      </label>
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {authErrorText(state.error, i18n.locale)}
        </p>
      )}
      {state.error === REGISTRATION_EXPIRED ? (
        <ButtonLink href="/login" className="mt-2">
          {t.backToLogin}
        </ButtonLink>
      ) : (
        <Button type="submit" disabled={!canSubmit} className="mt-2">
          {pending ? t.submitting : t.submit}
        </Button>
      )}
    </form>
  );
}
