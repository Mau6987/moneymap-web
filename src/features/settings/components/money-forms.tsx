"use client";

import { PlanLimitCard } from "@/features/billing/components/plan-limit-card";
import type { PlanLimit } from "@/features/billing/plan-limits";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";

import type { Currency } from "../data/settings-gateway";
import type { SettingsFormState } from "../settings-actions";
import { FormError } from "./form-error";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;

const selectClass =
  "bg-field border-line text-ink focus-ring h-11 min-w-0 flex-1 rounded-2xl border-[1.5px] px-3 text-sm font-semibold";

/** Spec 002, RF-13: la principal se elige entre Mis monedas; confirma que los montos no cambian. */
export function MainCurrencyForm({
  currencies,
  main,
  action,
}: {
  /** Solo Mis monedas. */
  currencies: Currency[];
  main: string;
  action: Action;
}) {
  const i18n = useMessages();
  const t = i18n.settings.money;
  const settingsMessages = i18n.settings;
  const [state, submit, pending] = useActionState(action, {});
  const [code, setCode] = useState(main);
  return (
    <form action={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="main-currency" className="sr-only">
          {t.main}
        </label>
        <select
          id="main-currency"
          name="main_currency"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={selectClass}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="md" variant="secondary" disabled={pending || code === main}>
          {pending ? settingsMessages.saving : t.saveMain}
        </Button>
      </div>
      {code !== main && <p className="text-muted text-xs font-semibold">{t.mainNote}</p>}
      <FormError code={state.error} />
    </form>
  );
}

/** El ahorro planificado del periodo, en la moneda principal. */
export function SavingsForm({
  amount,
  currency,
  decimals,
  action,
  back,
}: {
  /** Como la escribe el usuario (es-BO). */
  amount: string;
  currency: string;
  decimals: number;
  action: Action;
  /** Desde Safe to Spend se vuelve ahí al guardar. */
  back?: "/safe-to-spend";
}) {
  const i18n = useMessages();
  const t = i18n.settings.money;
  const settingsMessages = i18n.settings;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="decimals" value={decimals} />
      {back && <input type="hidden" name="back" value={back} />}
      <TextField
        label={t.savings}
        name="planned_savings"
        inputMode="decimal"
        defaultValue={amount}
        hint={<span className="text-muted">{t.savingsDetail(currency)}</span>}
      />
      <FormError code={state.error} />
      <div>
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          {pending ? settingsMessages.saving : t.saveSavings}
        </Button>
      </div>
    </form>
  );
}

/**
 * RF-14: Mis monedas, cada una con "Quitar"; la principal no se quita y lo
 * dice. Una con cuentas activas la rechaza la API (`currency_in_use`).
 */
export function MyCurrencies({
  currencies,
  remove,
  add,
  limit = null,
}: {
  /** El catálogo completo, con `is_mine` y `is_main_currency`. */
  currencies: Currency[];
  remove: Action;
  add: Action;
  /** MM-188: al tope de monedas del plan, el camino a Planes en lugar de sumar. */
  limit?: PlanLimit | null;
}) {
  const i18n = useMessages();
  const t = i18n.settings.money;
  const mine = currencies.filter((c) => c.is_mine);
  const others = currencies.filter((c) => !c.is_mine && c.is_active);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-[var(--mm-line)]">
        {mine.map((c) => (
          <li key={c.code} className="flex items-center gap-3 py-3">
            <span
              aria-hidden="true"
              className="bg-primary-soft text-primary-text grid size-[38px] shrink-0 place-items-center rounded-[12px] text-sm font-extrabold"
            >
              {c.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{c.code}</span>
              <span className="text-muted block text-xs">{c.name}</span>
            </span>
            {c.is_main_currency ? (
              <span className="bg-primary-soft text-primary-text rounded-full px-3 py-1 text-xs font-bold">
                {t.principal}
              </span>
            ) : (
              <RemoveCurrency code={c.code} action={remove} />
            )}
          </li>
        ))}
      </ul>
      {limit ? (
        <PlanLimitCard limit={limit} />
      ) : others.length > 0 ? (
        <AddCurrency currencies={others} action={add} />
      ) : (
        <p className="text-muted text-sm">{t.nothingToAdd}</p>
      )}
    </div>
  );
}

function RemoveCurrency({ code, action }: { code: string; action: Action }) {
  const i18n = useMessages();
  const t = i18n.settings.money;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col items-end gap-1">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" size="md" variant="ghost" disabled={pending}>
        {t.remove(code)}
      </Button>
      <FormError code={state.error} />
    </form>
  );
}

function AddCurrency({ currencies, action }: { currencies: Currency[]; action: Action }) {
  const i18n = useMessages();
  const t = i18n.settings.money;
  const settingsMessages = i18n.settings;
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="add-currency" className="sr-only">
          {t.addLabel}
        </label>
        <select id="add-currency" name="code" className={selectClass}>
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          {pending ? settingsMessages.saving : t.addButton}
        </Button>
      </div>
      <FormError code={state.error} />
    </form>
  );
}
