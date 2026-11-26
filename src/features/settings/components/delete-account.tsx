"use client";

import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { settingsErrorText } from "@/lib/i18n/settings-messages";

import type { SettingsFormState } from "../settings-actions";

import { useMessages } from "@/lib/i18n/client";
/**
 * "Eliminar cuenta": un diálogo nativo (foco atrapado y Esc) que explica qué
 * pasa y pide la contraseña. Sin contraseña, el botón queda deshabilitado.
 */
export function DeleteAccount({
  action,
}: {
  action: (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;
}) {
  const i18n = useMessages();
  const t = i18n.settings.data;
  const settingsMessages = i18n.settings;
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, submit, pending] = useActionState(action, {});
  const [password, setPassword] = useState("");

  return (
    <>
      <Button variant="secondary" size="md" onClick={() => dialog.current?.showModal()}>
        {t.deleteOpen}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-account-title"
        className="glass text-ink m-auto w-[min(440px,calc(100%-32px))] rounded-[26px] p-6 backdrop:bg-black/40"
      >
        <form action={submit} className="flex flex-col gap-4" noValidate>
          <h2 id="delete-account-title" className="text-xl font-extrabold">
            {t.dialogTitle}
          </h2>
          <p className="text-muted text-sm">{t.dialogBody}</p>
          <TextField
            label={t.password}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={state.error ? settingsErrorText(state.error, i18n.locale) : undefined}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setPassword("");
                dialog.current?.close();
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" variant="danger" size="md" disabled={pending || !password}>
              {pending ? settingsMessages.saving : t.confirm}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
