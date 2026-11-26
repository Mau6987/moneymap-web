"use client";

import { useId, useRef } from "react";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";

import { useMessages } from "@/lib/i18n/client";
/**
 * "Cerrar sesión" con confirmación en un diálogo nativo (foco atrapado y Esc).
 * Con `className` el botón toma el estilo de quien lo pone (el menú principal);
 * `labelClassName` permite ocultar el nombre donde solo se ve el ícono.
 */
export function LogoutButton({
  action,
  className,
  labelClassName,
}: {
  action: () => Promise<void>;
  className?: string;
  labelClassName?: string;
}) {
  const i18n = useMessages();
  const t = i18n.auth.logout;
  const dialog = useRef<HTMLDialogElement>(null);
  // El menú lo pone más de una vez en la página: cada diálogo con su título.
  const titleId = useId();
  const open = () => dialog.current?.showModal();

  return (
    <>
      {className ? (
        <button type="button" title={t.action} onClick={open} className={className}>
          <Icon name="logout" className="size-[18px] shrink-0" />
          <span className={labelClassName}>{t.action}</span>
        </button>
      ) : (
        <Button variant="secondary" className="text-coral-text" onClick={open}>
          <Icon name="logout" className="size-[18px]" />
          {t.action}
        </Button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="glass text-ink m-auto w-[min(420px,calc(100%-32px))] rounded-[26px] p-6 backdrop:bg-black/40"
      >
        <h2 id={titleId} className="text-xl font-extrabold">
          {t.title}
        </h2>
        <p className="text-muted mt-2 text-sm">{t.body}</p>
        <form action={action} className="mt-6 flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={() => dialog.current?.close()}>
            {t.cancel}
          </Button>
          <Button type="submit" size="md" variant="danger">
            {t.confirm}
          </Button>
        </form>
      </dialog>
    </>
  );
}
