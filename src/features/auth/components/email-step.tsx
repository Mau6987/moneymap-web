"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, ButtonLink } from "@/components/button";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { registerErrorText } from "@/lib/i18n/register-messages";

import { isValidEmail } from "../domain/email";
import type { LinkResult, LinkState } from "../verification-actions";

import { useMessages } from "@/lib/i18n/client";
/** El aviso de correo incompleto espera unas letras, como el mockup W03b. */
const MIN_CHARS_FOR_HINT = 4;

interface EmailStepProps {
  initialEmail: string;
  /** Llega desde "Tus datos" o desde una verificación perdida. */
  initialError?: string;
  initialTaken?: boolean;
  requestLink: (email: string) => Promise<LinkResult>;
  onSent: (link: LinkState) => void;
}

/** "Crear cuenta": pide solo el correo (spec 001, RF-2, RF-2a y RF-6). */
export function EmailStep(props: EmailStepProps) {
  const i18n = useMessages();
  const taken = i18n.register.taken;
  const t = i18n.register.email;
  const [email, setEmail] = useState(props.initialEmail);
  const [isTaken, setTaken] = useState(props.initialTaken ?? false);
  const [error, setError] = useState(props.initialError);
  const [pending, setPending] = useState(false);

  const valid = isValidEmail(email);
  const fieldError = isTaken
    ? taken.error
    : !valid && email.length >= MIN_CHARS_FOR_HINT
      ? t.invalid
      : undefined;
  const encoded = encodeURIComponent(email.trim());

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    const result = await props.requestLink(email);
    setPending(false);
    if (result.link) return props.onSent(result.link);
    if (result.error === "email_taken") return setTaken(true);
    setError(registerErrorText(result.error, i18n.locale));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
      <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">{t.title}</h2>
      <p className="text-muted mb-2 text-[15px] font-medium">{t.subtitle}</p>
      <TextField
        label={t.label}
        icon="mail"
        type="email"
        autoComplete="email"
        placeholder={t.placeholder}
        value={email}
        error={fieldError}
        onChange={(event) => {
          setEmail(event.target.value);
          setTaken(false);
          setError(undefined);
        }}
      />
      {error && (
        <p role="alert" className="text-coral-text text-[13px] font-bold">
          {error}
        </p>
      )}
      {isTaken ? (
        <>
          <div className="bg-field mt-2 flex items-center gap-3 rounded-2xl p-3.5">
            <span className="bg-primary-soft text-primary-text grid size-10 place-items-center rounded-full">
              <Icon name="lock" className="size-[18px]" />
            </span>
            <span>
              <b className="block text-sm">{taken.title}</b>
              <span className="text-muted text-xs font-semibold">{taken.body}</span>
            </span>
          </div>
          <ButtonLink href={`/login?email=${encoded}`} className="mt-2">
            {taken.signIn}
          </ButtonLink>
          <Link
            href={`/forgot-password?email=${encoded}`}
            className="focus-ring text-primary-text mt-1 text-center text-sm font-bold"
          >
            {taken.forgot}
          </Link>
        </>
      ) : (
        <Button type="submit" disabled={!valid || pending} className="mt-3">
          {pending ? t.sending : t.send}
        </Button>
      )}
      {!isTaken && (
        <p className="text-muted mt-3 text-center text-sm">
          {t.haveAccount}{" "}
          <Link href="/login" className="focus-ring text-primary-text font-extrabold">
            {t.signIn}
          </Link>
        </p>
      )}
    </form>
  );
}
