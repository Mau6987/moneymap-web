"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { cx } from "@/lib/cx";

import type { Cell } from "../domain/plans";
import type { PlanChangeState } from "../plans-actions";

import { useMessages } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/catalog";
/** Un plan listo para mostrar: los precios ya formateados en el servidor. */
export interface PlanCard {
  code: string;
  name: string;
  description: string | null;
  isFree: boolean;
  tier: number;
  monthly: string | null;
  yearly: string | null;
  savingPct: string | null;
  cells: Record<string, Cell>;
}

interface PlansViewProps {
  plans: PlanCard[];
  rows: { key: string; description: string }[];
  current: string;
  initial: string;
  /** MM-188: cambia el plan sin cobro (`changePlan`). */
  action: (state: PlanChangeState, form: FormData) => Promise<PlanChangeState>;
}

function cellText(cell: Cell | undefined, t: Messages["plans"]): string {
  if (!cell || cell.kind === "off") return t.notIncluded;
  if (cell.kind === "on") return t.included;
  if (cell.kind === "unlimited") return t.unlimited;
  return String(cell.limit);
}

/**
 * Los planes lado a lado (mockup "Web-Planes"), por mes o por año, con el
 * elegido resaltado. Todavía no hay cobros (MM-188): "Elegir" cambia el plan
 * al instante, y al bajar avisa que no se borra nada.
 */
export function PlansView({ plans, rows, current, initial, action }: PlansViewProps) {
  const i18n = useMessages();
  const t = i18n.plans;
  const [yearly, setYearly] = useState(false);
  const [selected, setSelected] = useState(initial);
  const chosen = plans.find((p) => p.code === selected);
  const mine = plans.find((p) => p.code === current);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t.billing}
          className="glass inline-flex gap-1 rounded-3xl p-1"
        >
          {[
            { value: false, label: t.monthly },
            { value: true, label: t.yearly },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={yearly === option.value}
              onClick={() => setYearly(option.value)}
              className={cx(
                "focus-ring h-10 rounded-[20px] px-5 text-sm font-bold",
                yearly === option.value
                  ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                  : "text-ink-2",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {yearly && chosen?.savingPct && (
          <p data-testid="plans-saving" className="text-green-text text-sm font-extrabold">
            {t.saving(chosen.savingPct)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {plans.map((plan) => {
          const on = plan.code === selected;
          const amount = plan.isFree ? t.free : yearly && plan.yearly ? plan.yearly : plan.monthly;
          const unit = plan.isFree ? "" : yearly && plan.yearly ? t.perYear : t.perMonth;
          return (
            <article
              key={plan.code}
              data-testid={`plan-${plan.code}`}
              className={cx(
                "glass flex min-w-0 flex-col rounded-[26px] p-5",
                on && "outline-primary outline-2 -outline-offset-2",
              )}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(plan.code)}
                className="focus-ring -m-1 rounded-2xl p-1 text-left"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[17px] font-extrabold">{plan.name}</span>
                  {plan.code === current && (
                    <span className="bg-primary-soft text-primary-text inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-extrabold">
                      {t.current}
                    </span>
                  )}
                </span>
                <span className="mt-2.5 block text-[30px] font-extrabold tracking-[-0.02em] tabular-nums">
                  {amount}
                  {unit && <span className="text-muted text-[13px] font-semibold"> {unit}</span>}
                </span>
                {plan.description && (
                  <span className="text-muted mt-1 block text-[13px] font-medium">
                    {plan.description}
                  </span>
                )}
              </button>
              <dl className="mt-3">
                {/* BUG-042: el efectivo no tiene límite en ningún plan (solo las tarjetas). */}
                <div className="border-line flex items-center justify-between gap-3 border-b py-2.5 text-sm font-semibold">
                  <dt className="text-ink-2 min-w-0">{t.cash}</dt>
                  <dd className="shrink-0 font-bold" data-testid={`plan-${plan.code}-cash`}>
                    {t.unlimited}
                  </dd>
                </div>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className="border-line flex items-center justify-between gap-3 border-b py-2.5 text-sm font-semibold last:border-0"
                  >
                    <dt className="text-ink-2 min-w-0">{row.description}</dt>
                    <dd className="shrink-0 font-bold" data-testid={`plan-${plan.code}-${row.key}`}>
                      {cellText(plan.cells[row.key], t)}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>
      {chosen && chosen.code !== current && (
        <form action={formAction} className="flex flex-col items-center gap-2">
          <input type="hidden" name="code" value={chosen.code} />
          <Button type="submit" disabled={pending} data-testid="plans-choose">
            {chosen.isFree ? t.chooseFree(chosen.name) : t.choose(chosen.name)}
          </Button>
          <p
            data-testid="plans-note"
            className="text-muted max-w-md text-center text-xs font-semibold"
          >
            {mine && chosen.tier < mine.tier ? t.downgradeNote : t.noCharge}
          </p>
          {state.error && (
            <p role="alert" className="text-coral-text text-center text-sm font-bold">
              {t.changeError}
            </p>
          )}
        </form>
      )}
    </>
  );
}
