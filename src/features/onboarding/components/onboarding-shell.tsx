import type { ReactNode } from "react";

import { Icon } from "@/components/icon";
import { cx } from "@/lib/cx";

import { STEPS, stepNumber, type Step } from "../domain/steps";

import { useServerMessages } from "@/lib/i18n/server";
export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * El marco del mockup "Web-Onboarding": el logo, "Paso n de 7", los pasos
 * arriba, el paso en el centro y, solo para el administrador, "Tu resumen" al
 * costado (debajo en el teléfono; BUG-019). Cada paso se anuncia con su número (spec 007, accesibilidad).
 */
export function OnboardingShell({
  step,
  summary,
  children,
}: {
  step: Step;
  /** Solo para el administrador (BUG-019); sin él, el paso ocupa todo el ancho. */
  summary?: SummaryRow[];
  children: ReactNode;
}) {
  const i18n = useServerMessages();
  const t = i18n.onboarding;
  const n = stepNumber(step);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col gap-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-primary grid size-10 place-items-center rounded-[13px] text-white"
          >
            <Icon name="pin" className="size-5" />
          </span>
          <span className="text-xl font-extrabold tracking-[-0.02em]">MoneyMap</span>
        </div>
        <p className="text-muted text-[13px] font-semibold">{t.progress(n, STEPS.length)}</p>
      </header>
      <nav aria-label={t.stepsLabel} className="overflow-x-auto">
        <ol className="flex min-w-max gap-1.5">
          {STEPS.map((s, i) => {
            const state = i + 1 < n ? "done" : i + 1 === n ? "current" : "next";
            return (
              <li
                key={s}
                aria-current={state === "current" ? "step" : undefined}
                className={cx(
                  // `relative`: el texto "hecho" (sr-only) queda dentro del scroll.
                  "relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
                  state === "current" && "bg-primary-soft text-primary-text",
                  state === "done" && "text-green-text",
                  state === "next" && "text-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "grid size-6 place-items-center rounded-full text-[11px]",
                    state === "done" ? "bg-green-soft" : "bg-well",
                  )}
                >
                  {state === "done" ? <Icon name="check" className="size-3.5" /> : i + 1}
                </span>
                {t.steps[s]}
                {state === "done" && <span className="sr-only">({t.done})</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <div
        className={cx(
          "grid grid-cols-[minmax(0,1fr)] items-start gap-4",
          summary ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "mx-auto w-full max-w-[760px]",
        )}
      >
        <main className="glass min-w-0 rounded-[26px] p-5 md:p-7">{children}</main>
        {summary && (
          <aside aria-labelledby="summary-title" className="glass rounded-[26px] p-5">
            <h2 id="summary-title" className="text-[15px] font-extrabold">
              {t.summary.title}
            </h2>
            <p className="text-muted text-xs">{t.summary.subtitle}</p>
            <dl className="mt-3 flex flex-col divide-y divide-[var(--mm-line)]">
              {summary.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 py-2.5 text-sm">
                  <dt className="text-muted font-semibold">{row.label}</dt>
                  <dd className="text-right font-bold">{row.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}

/** El título y la bajada de un paso. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] max-md:text-[22px]">{title}</h1>
      {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}

/**
 * Una opción de radio con forma de tarjeta, solo con CSS: el radio nativo
 * queda para el teclado y el lector de pantalla.
 */
export function Option({
  name,
  value,
  checked,
  label,
  detail,
  aside,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  detail?: string;
  aside?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "bg-well flex cursor-pointer items-center gap-3 rounded-[18px] border-2 border-transparent p-3.5",
        "has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
        "has-[:focus-visible]:outline-primary-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
      )}
    >
      <input type="radio" name={name} value={value} defaultChecked={checked} className="sr-only" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{label}</span>
        {detail && <span className="text-muted block text-xs">{detail}</span>}
      </span>
      {aside}
    </label>
  );
}
