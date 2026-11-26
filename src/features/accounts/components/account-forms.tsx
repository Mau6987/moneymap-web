"use client";

import { PlanLimitCard } from "@/features/billing/components/plan-limit-card";
import type { PlanLimit } from "@/features/billing/plan-limits";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";
import { moneyErrorText } from "@/lib/i18n/money-messages";

import type { AccountFormState } from "../accounts-actions";

import { useMessages } from "@/lib/i18n/client";
export interface CurrencyOption {
  code: string;
  name: string;
  decimals: number;
}

type Action = (state: AccountFormState, form: FormData) => Promise<AccountFormState>;

const chip = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "bg-well text-ink-2",
  );

function ErrorMessage({ code }: { code?: string }) {
  const i18n = useMessages();
  if (!code) return null;
  return (
    <p
      role="alert"
      className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
    >
      {moneyErrorText(code, i18n.locale)}
    </p>
  );
}

/**
 * "Nueva cuenta" (spec 002, RF-1 a RF-3; mockup "Web-Cuentas"): efectivo o
 * tarjeta, su nombre, el saldo con que empieza y la moneda, que se elige una
 * vez. Arranca en la moneda principal.
 */
export function NewAccountForm({
  action,
  currencies,
  limits,
}: {
  action: Action;
  /** La principal y Mis monedas primero; después el resto del catálogo. */
  currencies: CurrencyOption[];
  /**
   * MM-188: los límites del plan ya alcanzados. Una tarjeta cuenta contra
   * `cards`; una moneda sin cuentas todavía, contra `currencies`.
   */
  limits?: { cards: PlanLimit | null; currencies: PlanLimit | null; withAccounts: string[] };
}) {
  const i18n = useMessages();
  const t = i18n.accounts;
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<"cash" | "card">("cash");
  const [name, setName] = useState<string>(t.typeCash);
  const [opening, setOpening] = useState("");
  const [last4, setLast4] = useState("");
  const [currency, setCurrency] = useState(currencies[0]?.code ?? "");
  const decimals = currencies.find((c) => c.code === currency)?.decimals ?? 2;
  const blocked =
    (type === "card" ? limits?.cards : null) ??
    (limits && !limits.withAccounts.includes(currency) ? limits.currencies : null);

  const pickType = (next: "cash" | "card") => {
    setType(next);
    // El nombre sugerido sigue al tipo mientras el usuario no lo cambió.
    if (name === t.typeCash || name === t.typeCard) {
      setName(next === "cash" ? t.typeCash : t.typeCard);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="decimals" value={decimals} />
      <h2 className="text-[15px] font-extrabold">{t.newTitle}</h2>
      <div role="radiogroup" aria-label={t.type} className="flex gap-2">
        {(["cash", "card"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={type === k}
            onClick={() => pickType(k)}
            className={chip(type === k)}
          >
            {k === "cash" ? t.typeCash : t.typeCard}
          </button>
        ))}
      </div>
      <TextField
        label={t.name}
        name="name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label={type === "cash" ? t.openingCash : t.openingCard}
        name="opening"
        inputMode="decimal"
        placeholder="0"
        value={opening}
        onChange={(e) => setOpening(e.target.value)}
      />
      {type === "card" && (
        <TextField
          label={t.last4}
          name="last4"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
        />
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="new-account-currency" className="text-sm font-bold">
          {t.currency}
        </label>
        <select
          id="new-account-currency"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-describedby="new-account-currency-hint"
          className="focus-ring bg-field border-line h-12 rounded-[16px] border px-3 text-sm font-semibold"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        <span id="new-account-currency-hint" className="text-muted text-xs">
          {t.currencyHint}
        </span>
      </div>
      <ErrorMessage code={state.error} />
      {blocked ? (
        <PlanLimitCard limit={blocked} />
      ) : (
        <Button type="submit" size="md" disabled={pending || !name.trim()}>
          {t.create}
        </Button>
      )}
    </form>
  );
}

/** Renombrar una cuenta; la moneda queda como está. */
export function RenameAccountForm({
  action,
  id,
  currentName,
}: {
  action: Action;
  id: string;
  currentName: string;
}) {
  const i18n = useMessages();
  const t = i18n.accounts;
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(currentName);
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3" noValidate>
      <input type="hidden" name="id" value={id} />
      <TextField
        label={t.renameTitle(currentName)}
        name="name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
      />
      <ErrorMessage code={state.error} />
      <div className="flex justify-end gap-2">
        <Link
          href="/accounts"
          className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
        >
          {t.cancel}
        </Link>
        <Button type="submit" size="md" disabled={pending || !name.trim()}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}
