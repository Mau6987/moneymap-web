"use client";

import { useActionState } from "react";

import { cx } from "@/lib/cx";

import type { SettingsFormState } from "../settings-actions";
import { FormError } from "./form-error";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;

/**
 * Una preferencia con pocas opciones ("Claro · Oscuro · Sistema"): cada opción
 * es un botón que manda su valor; la página vuelve con lo que guardó la API.
 * Si falla, la opción anterior sigue marcada y se dice por qué (RF-14).
 */
export function ChoiceForm({
  name,
  label,
  current,
  options,
  action,
  section = "profile",
}: {
  name: string;
  label: string;
  current: string;
  options: { value: string; label: string }[];
  action: Action;
  section?: "profile" | "security";
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col items-end gap-2">
      <input type="hidden" name="section" value={section} />
      <div
        role="group"
        aria-label={label}
        // En el teléfono las cuatro de Idioma no entran en una fila: van de a dos.
        className={cx(
          "bg-well p-1",
          options.length > 3
            ? "grid w-full grid-cols-2 rounded-[22px] sm:flex sm:w-auto sm:rounded-full"
            : "flex rounded-full",
        )}
      >
        {options.map((option) => {
          const on = option.value === current;
          return (
            <button
              key={option.value}
              type="submit"
              name={name}
              value={option.value}
              aria-pressed={on}
              disabled={pending}
              className={cx(
                "focus-ring h-9 rounded-full px-4 text-[13px] font-bold transition-colors",
                on
                  ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                  : "text-ink-2",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <FormError code={state.error} />
    </form>
  );
}

/** Un interruptor que guarda su valor nuevo al tocarlo (RF-15: abrir con los montos ocultos). */
export function SwitchForm({
  name,
  on,
  labelledBy,
  describedBy,
  action,
  section = "profile",
}: {
  name: string;
  on: boolean;
  labelledBy: string;
  describedBy?: string;
  action: Action;
  section?: "profile" | "security";
}) {
  const i18n = useMessages();
  const settingsMessages = i18n.settings;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col items-end gap-2">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name={name} value={String(!on)} />
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        disabled={pending}
        className={cx(
          "focus-ring relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors",
          on ? "bg-primary" : "bg-[var(--mm-well)]",
        )}
      >
        <span className="sr-only">
          {on ? settingsMessages.toggleOn : settingsMessages.toggleOff}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-[3px] size-6 rounded-full bg-white shadow transition-[left]",
            on ? "left-[25px]" : "left-[3px]",
          )}
        />
      </button>
      <FormError code={state.error} />
    </form>
  );
}
