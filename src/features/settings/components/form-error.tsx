"use client";

import { settingsErrorText } from "@/lib/i18n/settings-messages";

import { useMessages } from "@/lib/i18n/client";
/** El error de un formulario de Ajustes, anunciado al lector de pantalla. */
export function FormError({ code }: { code?: string }) {
  const i18n = useMessages();
  if (!code) return null;
  return (
    <p
      role="alert"
      className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
    >
      {settingsErrorText(code, i18n.locale)}
    </p>
  );
}
