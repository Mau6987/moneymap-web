"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Icon, type IconName } from "./icon";

interface TextFieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  icon?: IconName;
  /** Mensaje de error; pinta el campo en coral y lo anuncia al lector de pantalla. */
  error?: string;
  /** Texto de ayuda o de éxito debajo del campo. */
  hint?: ReactNode;
  /** Algo a la derecha de la etiqueta, como "¿La olvidaste?". */
  aside?: ReactNode;
}

export function TextField({
  label,
  icon,
  error,
  hint,
  aside,
  className = "",
  ...input
}: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const invalid = Boolean(error);

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-muted text-xs font-semibold">
          {label}
        </label>
        {aside}
      </div>
      <div
        className={cx(
          "flex h-[52px] items-center gap-2.5 rounded-2xl border-[1.5px] px-4",
          "focus-within:outline-primary-text focus-within:outline-2 focus-within:outline-offset-2",
          invalid
            ? "border-coral bg-coral-soft text-coral-text"
            : "bg-field border-line text-muted",
        )}
      >
        {icon && <Icon name={icon} />}
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className="text-ink min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
          {...input}
        />
      </div>
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="text-coral-text flex items-center gap-1.5 text-[13px] font-bold"
        >
          <Icon name="alert" className="size-[15px]" />
          {error}
        </p>
      ) : (
        hint && (
          <div id={messageId} className="text-xs font-bold">
            {hint}
          </div>
        )
      )}
    </div>
  );
}
