"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Toast } from "@/components/toast";
import { cx } from "@/lib/cx";
import { registerErrorText } from "@/lib/i18n/register-messages";

import { VERIFICATION_MISSING } from "../domain/verification";
import type { LinkResult, LinkState } from "../verification-actions";
import { useMessages } from "@/lib/i18n/client";
const TOAST_MS = 3000;

type View = "sent" | "resent" | "pending" | "expired" | "verified";

interface VerifyStepProps {
  link: LinkState;
  resendLink: () => Promise<LinkResult>;
  checkLink: () => Promise<LinkResult>;
  onVerified: () => void;
  /** Volver al correo, con un aviso si la verificación se perdió. */
  onChangeEmail: (error?: string) => void;
  /** El reloj; los tests lo fijan. */
  now?: () => number;
}

function viewOf(status: LinkState["status"], fallback: View): View {
  if (status === "verified") return "verified";
  if (status === "expired") return "expired";
  return fallback;
}

function secondsUntil(iso: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000));
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const heroes: Record<View, { icon: IconName; tone: string }> = {
  sent: { icon: "mail", tone: "bg-primary" },
  resent: { icon: "mail", tone: "bg-primary" },
  pending: { icon: "mail", tone: "bg-amber" },
  expired: { icon: "alert", tone: "bg-[#b5422b]" },
  verified: { icon: "check", tone: "bg-green" },
};

/** "Revisa tu correo" y sus estados (spec 001, RF-2b a RF-2e; mockups W03d a W03h). */
export function VerifyStep({ link: initial, now = Date.now, ...props }: VerifyStepProps) {
  const i18n = useMessages();
  const t = i18n.register.verify;
  const [link, setLink] = useState(initial);
  const [view, setView] = useState<View>(viewOf(initial.status, "sent"));
  const [time, setTime] = useState(now);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(now()), 1000);
    return () => clearInterval(timer);
  }, [now]);

  const handle = useCallback(
    (result: LinkResult, fallback: View) => {
      if (result.error === VERIFICATION_MISSING)
        return props.onChangeEmail(registerErrorText(result.error, i18n.locale));
      if (!result.link) return setError(registerErrorText(result.error, i18n.locale));
      setError(undefined);
      setLink(result.link);
      setView(viewOf(result.link.status, fallback));
    },
    [props, i18n.locale],
  );

  // RF-2d: al volver a la pestaña después de abrir el link, pregunta sola y
  // solo avanza si cambió algo; nunca muestra "Aún no lo vemos" por su cuenta.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const result = await props.checkLink();
      if (result.link && result.link.status !== "pending") handle(result, "sent");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [props, handle]);

  async function run(call: () => Promise<LinkResult>, fallback: View) {
    setBusy(true);
    const result = await call();
    setBusy(false);
    handle(result, fallback);
    return result;
  }

  async function resend() {
    const result = await run(props.resendLink, "resent");
    if (result.link) {
      setToast(true);
      setTimeout(() => setToast(false), TOAST_MS);
    }
  }

  const wait = secondsUntil(link.resendAvailableAt, time);
  const minutesLeft = Math.ceil(secondsUntil(link.expiresAt, time) / 60);
  const titles: Record<View, [string, string]> = {
    sent: [t.sentTitle, t.expiresIn(minutesLeft)],
    resent: [t.sentTitle, t.resentSubtitle],
    pending: [t.pendingTitle, t.pendingSubtitle],
    expired: [t.expiredTitle, t.expiredSubtitle],
    verified: [t.verifiedTitle, t.verifiedSubtitle],
  };
  const [title, subtitle] = titles[view];
  const hero = heroes[view];
  const resendButton = (primary: boolean, label: string) => (
    <Button
      variant={primary ? "primary" : "secondary"}
      disabled={busy || wait > 0}
      onClick={resend}
    >
      {wait > 0 ? t.resendIn(clock(wait)) : label}
    </Button>
  );

  return (
    <div className="flex flex-col items-stretch gap-2.5 text-center">
      <div className="relative mx-auto grid size-32 place-items-center" aria-hidden="true">
        <span className="bg-primary-soft absolute inset-0 rounded-full" />
        <span className="bg-primary-soft absolute inset-4 rounded-full" />
        <span
          className={cx(
            "relative grid size-[68px] place-items-center rounded-[22px] text-white",
            hero.tone,
          )}
        >
          <Icon name={hero.icon} className="size-8" />
        </span>
      </div>
      <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="text-muted text-[15px] font-medium">{subtitle}</p>
      <span className="bg-field self-center rounded-full px-3.5 py-1.5 text-sm font-bold">
        {link.email}
      </span>
      {error && (
        <p role="alert" className="text-coral-text text-[13px] font-bold">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2.5">
        {view === "verified" ? (
          <Button onClick={props.onVerified}>{t.continue}</Button>
        ) : view === "pending" ? (
          resendButton(true, t.resend)
        ) : view === "expired" ? (
          resendButton(true, t.newLink)
        ) : (
          <>
            <Button disabled={busy} onClick={() => run(props.checkLink, "pending")}>
              {t.checked}
            </Button>
            {resendButton(false, t.resend)}
          </>
        )}
        {view !== "verified" && (
          <Button variant="ghost" size="md" onClick={() => props.onChangeEmail()}>
            {t.changeEmail}
          </Button>
        )}
      </div>
      {toast && <Toast>{t.resentToast}</Toast>}
    </div>
  );
}
