"use client";

import { useActionState } from "react";

import { Button } from "@/components/button";
import { cx } from "@/lib/cx";

import type { NoticeSetting } from "../data/notifications-gateway";
import { noticeDomId } from "../domain/notices";
import type { NoticesState } from "../notifications-actions";

import type { Messages } from "@/lib/i18n/catalog";
import { useMessages } from "@/lib/i18n/client";
const errorText = (code: string, t: Messages["notifications"]) =>
  code === "network_error" ? t.offline : t.saveError;

/** "Marcar todo como leído"; si falla, lo dice al lado. */
export function MarkReadForm({
  action,
}: {
  action: (state: NoticesState) => Promise<NoticesState>;
}) {
  const i18n = useMessages();
  const t = i18n.notifications;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-wrap items-center gap-3">
      {state.error && (
        <p role="alert" className="text-coral-text text-sm font-semibold">
          {errorText(state.error, t)}
        </p>
      )}
      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? t.marking : t.markRead}
      </Button>
    </form>
  );
}

/**
 * Un interruptor por tipo de aviso (RF-11). Es un botón dentro de su propio
 * formulario: manda el valor nuevo y la página vuelve con lo que guardó la API.
 * Los de seguridad y cobro no se apagan (RF-12): quedan fijos.
 */
export function NoticeSwitch({
  setting,
  action,
}: {
  setting: NoticeSetting;
  action: (state: NoticesState, form: FormData) => Promise<NoticesState>;
}) {
  const i18n = useMessages();
  const t = i18n.notifications;
  const [state, submit, pending] = useActionState(action, {});
  const on = setting.enabled;
  const id = noticeDomId(setting.type);
  return (
    <form action={submit} className="flex items-center gap-3">
      <input type="hidden" name="type" value={setting.type} />
      <input type="hidden" name="enabled" value={String(!on)} />
      {state.error && (
        <p role="alert" className="text-coral-text text-xs font-semibold">
          {errorText(state.error, t)}
        </p>
      )}
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-description`}
        disabled={!setting.can_disable || pending}
        data-testid={id}
        className={cx(
          "focus-ring relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors",
          "disabled:cursor-not-allowed",
          on ? "bg-primary" : "bg-[var(--mm-well)]",
          !setting.can_disable && "opacity-60",
        )}
      >
        <span className="sr-only">{on ? t.on : t.off}</span>
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-[3px] size-6 rounded-full bg-white shadow transition-[left]",
            on ? "left-[25px]" : "left-[3px]",
          )}
        />
      </button>
    </form>
  );
}
