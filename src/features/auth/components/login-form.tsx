"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { authErrorText } from "@/lib/i18n/auth-messages";

import { isValidEmail } from "../domain/email";
import type { LoginState } from "../login-action";

import { useMessages } from "@/lib/i18n/client";
interface LoginFormProps {
  action: (state: LoginState, form: FormData) => Promise<LoginState>;
  /** Correo ya escrito, por ejemplo al venir de "Este correo ya tiene una cuenta" (RF-2). */
  initialEmail?: string;
  /** La sesión anterior terminó (RF-20). */
  expired?: boolean;
  /** "o continúa con" y Google (RF-8), debajo de "Entrar". */
  social?: ReactNode;
}

export function LoginForm({ action, initialEmail = "", expired = false, social }: LoginFormProps) {
  const i18n = useMessages();
  const t = i18n.auth.login;
  const authMessages = i18n.auth;
  const [state, formAction, pending] = useActionState(action, { email: initialEmail });
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");

  // RF-5: con credenciales incorrectas se vacía la contraseña y se conserva el correo.
  useEffect(() => {
    if (state.error === "invalid_credentials") setPassword("");
  }, [state]);

  const canSubmit = isValidEmail(email) && password.length > 0 && !pending;
  const error = state.error ? authErrorText(state.error, i18n.locale) : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-2.5" noValidate>
      <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">{t.title}</h2>
      <p className="text-muted mb-2.5 text-sm font-medium">{t.subtitle}</p>
      {expired && !state.error && (
        <p
          role="status"
          className="bg-amber-soft text-amber-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {authMessages.sessionExpired}
        </p>
      )}
      <TextField
        label={t.email}
        icon="mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t.emailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label={t.password}
        icon="lock"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus={initialEmail.length > 0}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={error}
        aside={
          <Link
            href={
              email
                ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                : "/forgot-password"
            }
            className="focus-ring text-primary-text text-xs font-semibold"
          >
            {t.forgot}
          </Link>
        }
      />
      <Button type="submit" disabled={!canSubmit} className="mt-3">
        {pending ? t.submitting : t.submit}
      </Button>
      {social && <div className="mt-3">{social}</div>}
      <p className="text-muted mt-4 text-center text-sm">
        {t.newHere}{" "}
        <Link href="/register" className="focus-ring text-primary-text font-extrabold">
          {t.createAccount}
        </Link>
      </p>
    </form>
  );
}
