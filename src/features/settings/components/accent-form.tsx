"use client";

import { useActionState } from "react";

import { cx } from "@/lib/cx";

import type { SettingsFormState } from "../settings-actions";

/** El color de acento, como en la app: un toque lo guarda (spec 001, RF-13). */
export function AccentForm({
  current,
  label,
  options,
  action,
}: {
  current: string;
  label: string;
  /** Los colores con su nombre para el lector de pantalla, ya escrito en el servidor. */
  options: { hex: string; label: string }[];
  action: (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;
}) {
  const [, submit, pending] = useActionState(action, {});
  const selected = current.toUpperCase();
  return (
    <form action={submit}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(({ hex, label: name }) => (
          <button
            key={hex}
            type="submit"
            name="accent_color"
            value={hex}
            disabled={pending}
            aria-pressed={hex === selected}
            aria-label={name}
            title={name}
            className={cx(
              "focus-ring size-9 rounded-full border-2",
              hex === selected ? "border-ink" : "border-transparent",
            )}
            style={{ background: hex }}
          />
        ))}
      </div>
    </form>
  );
}
