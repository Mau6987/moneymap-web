"use client";

import { useEffect } from "react";

import { useMessages } from "@/lib/i18n/client";

import { Button, ButtonLink } from "./button";
import { StatusScreen } from "./status-screen";

/**
 * "Algo salió mal" (MM-182): lo que muestran los `error.tsx`. Reintentar
 * vuelve a pedir la pantalla; la referencia (el digest de Next) sirve para
 * buscar el error en los logs sin mostrar nada del usuario.
 */
export function ErrorScreen({
  error,
  reset,
  fullScreen = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  fullScreen?: boolean;
}) {
  const t = useMessages().common.status.error;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusScreen
      fullScreen={fullScreen}
      tone="coral"
      icon="alert"
      title={t.title}
      body={t.body}
      detail={error.digest ? t.reference(error.digest) : undefined}
      actions={
        <>
          <Button size="md" onClick={reset}>
            {t.retry}
          </Button>
          <ButtonLink href="/map" size="md" variant="secondary">
            {t.home}
          </ButtonLink>
        </>
      }
    />
  );
}
