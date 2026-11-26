"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/button";
import { DEMO_GOOGLE_TOKEN } from "@/lib/demo";
import { authErrorText } from "@/lib/i18n/auth-messages";

import type { GoogleState } from "../google-actions";

import { useMessages } from "@/lib/i18n/client";
/** Lo poco que usamos de Google Identity Services (`accounts.google.com/gsi/client`). */
interface GoogleIdentity {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup";
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline" | "filled_black";
      size: "large";
      text: "continue_with";
      shape: "pill";
      locale: string;
      width: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

/**
 * "o continúa con" y el botón de Google (spec 008, RF-8 a RF-11). El botón lo
 * dibuja Google y da el `id_token`; la server action lo manda a la API, así
 * que los tokens nunca pasan por el navegador. Cerrar la ventana de Google no
 * muestra error (RF-11). En el modo demo es un botón propio que simula a Google.
 */
export function GoogleButton({
  action,
  clientId,
  demo,
}: {
  action: (idToken: string) => Promise<GoogleState>;
  clientId?: string;
  demo: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.auth.google;
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);

  const send = (idToken: string) =>
    startTransition(async () => {
      setError(undefined);
      const result = await action(idToken);
      if (result?.error) setError(result.error);
    });

  useEffect(() => {
    const id = window.google?.accounts?.id;
    if (demo || !clientId || !ready || !id || !slot.current) return;
    id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) send(response.credential);
      },
      ux_mode: "popup",
      cancel_on_tap_outside: true,
    });
    const dark = document.documentElement.dataset.theme === "dark";
    id.renderButton(slot.current, {
      type: "standard",
      theme: dark ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      locale: "es",
      width: Math.min(400, slot.current.clientWidth || 320),
    });
    // `send` cambia en cada render; Google solo necesita el callback una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, clientId, ready]);

  if (!demo && !clientId) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--mm-line)]" />
        <span className="text-muted text-xs font-semibold">{t.divider}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--mm-line)]" />
      </div>
      {demo ? (
        <Button variant="secondary" disabled={pending} onClick={() => send(DEMO_GOOGLE_TOKEN)}>
          {pending ? t.signingIn : t.demoButton}
        </Button>
      ) : (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={() => setReady(true)}
            onError={() => setError("google_unavailable")}
          />
          <div ref={slot} className="flex min-h-11 justify-center" aria-busy={pending} />
        </>
      )}
      {error && (
        <p role="alert" className="text-coral-text text-center text-[13px] font-bold">
          {error === "google_unavailable" ? t.unavailable : authErrorText(error, i18n.locale)}
        </p>
      )}
    </div>
  );
}
