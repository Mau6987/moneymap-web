"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { registerErrorText } from "@/lib/i18n/register-messages";

import { MIN_PASSWORD_LENGTH, cleanName, passwordsMatch } from "../domain/register-validation";
import type { AccountInput } from "../account-actions";
import { PasswordStrengthBar } from "./password-strength-bar";

import { useMessages } from "@/lib/i18n/client";
interface DataStepProps {
  email: string;
  createAccount: (input: AccountInput) => Promise<{ error: string }>;
  /** La API ya no acepta la verificación: vuelve a pedir el link o el correo. */
  onVerificationLost: (code: string) => void;
}

/** "Tus datos" (spec 001, RF-2f, RF-3 y RF-5; mockup W03i). */
export function DataStep({ email, createAccount, onVerificationLost }: DataStepProps) {
  const i18n = useMessages();
  const t = i18n.register.data;
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirm: "" });
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const shortPassword = form.password.length > 0 && form.password.length < MIN_PASSWORD_LENGTH;
  const matches = passwordsMatch(form.password, form.confirm);
  const complete =
    cleanName(form.firstName).length > 0 &&
    cleanName(form.lastName).length > 0 &&
    form.password.length >= MIN_PASSWORD_LENGTH &&
    matches &&
    accepted;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete || pending) return;
    setPending(true);
    const result = await createAccount(form);
    setPending(false);
    if (["verification_expired", "verification_missing", "email_taken"].includes(result.error)) {
      return onVerificationLost(result.error);
    }
    setError(registerErrorText(result.error, i18n.locale));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <span className="bg-green-soft text-green-text inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-extrabold">
        <Icon name="check" className="size-3.5" />
        {t.verified(email)}
      </span>
      <h2 className="mt-1 mb-1 text-[28px] font-extrabold tracking-[-0.02em]">{t.title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label={t.firstName}
          autoComplete="given-name"
          placeholder={t.firstNamePlaceholder}
          value={form.firstName}
          onChange={set("firstName")}
        />
        <TextField
          label={t.lastName}
          autoComplete="family-name"
          placeholder={t.lastNamePlaceholder}
          value={form.lastName}
          onChange={set("lastName")}
        />
      </div>
      <TextField
        label={t.password}
        type="password"
        autoComplete="new-password"
        value={form.password}
        onChange={set("password")}
        error={shortPassword ? t.passwordShort(MIN_PASSWORD_LENGTH) : undefined}
      />
      <PasswordStrengthBar password={form.password} />
      <TextField
        label={t.confirm}
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={set("confirm")}
        error={form.confirm.length > 0 && !matches ? t.noMatch : undefined}
        hint={matches ? <span className="text-green-text">{t.match}</span> : undefined}
      />
      <label className="text-ink-2 mt-2 flex items-center gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="accent-primary focus-ring size-[22px] shrink-0 rounded-[7px]"
        />
        <span>
          {t.termsPrefix} <b>{t.terms}</b> {t.termsMiddle} <b>{t.privacy}</b>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-coral-text text-[13px] font-bold">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!complete || pending} className="mt-3">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
