"use client";

import { useActionState, type ReactNode } from "react";

import { Button, ButtonLink } from "@/components/button";
import { onboardingErrorText } from "@/lib/i18n/onboarding-messages";

import type { StepState } from "../onboarding-actions";

import { useMessages } from "@/lib/i18n/client";
/**
 * El formulario de un paso: lo que el paso pide, el error si guardar falló
 * (lo escrito se queda, RF-11) y abajo "Atrás", "Omitir" (pasos opcionales,
 * RF-9) y "Continuar", que se deshabilita mientras guarda.
 */
export function StepForm({
  action,
  back,
  hidden = {},
  canSkip = false,
  submitLabel,
  extra,
  children,
}: {
  action: (state: StepState, form: FormData) => Promise<StepState>;
  back?: string;
  hidden?: Record<string, string>;
  canSkip?: boolean;
  submitLabel?: string;
  /** Otro botón de envío, como "Omitir ingreso y gastos". */
  extra?: ReactNode;
  children: ReactNode;
}) {
  const i18n = useMessages();
  const t = i18n.onboarding;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col gap-5" noValidate>
      {/* Enter envía "Continuar", no "Omitir": el primer botón de envío es el que vale. */}
      <button type="submit" tabIndex={-1} aria-hidden="true" className="sr-only" />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {state.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {onboardingErrorText(state.error, i18n.locale)}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        {back ? (
          <ButtonLink href={back} variant="secondary" size="md">
            {t.back}
          </ButtonLink>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2.5">
          {extra}
          {canSkip && (
            <Button
              type="submit"
              name="skip"
              value="true"
              variant="ghost"
              size="md"
              disabled={pending}
            >
              {t.skip}
            </Button>
          )}
          <Button type="submit" size="md" disabled={pending}>
            {pending ? t.saving : (submitLabel ?? t.next)}
          </Button>
        </div>
      </div>
    </form>
  );
}
