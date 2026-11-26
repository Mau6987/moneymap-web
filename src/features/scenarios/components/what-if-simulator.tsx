"use client";

import Decimal from "decimal.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";

import { CardTitle, GlassCard } from "@/components/glass-card";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";
import { useMessages } from "@/lib/i18n/client";
import { scenarioErrorText } from "@/lib/i18n/scenarios-messages";
import { CurrencyCatalog, type CurrencyInfo } from "@/lib/money/currency";
import { HIDDEN_AMOUNT, formatMoney, formatNumber } from "@/lib/money/money";
import { parseAmount } from "@/lib/money/parse";

import { categoryGlyph } from "../category-glyph";
import type { BaseQuery, PeriodType, WhatIfBase } from "../data/scenarios-gateway";
import type { WhatIfBaseState } from "../scenarios-actions";
import {
  RANGE,
  amountAt,
  amountOf,
  goalMonthsLeft,
  positionFor,
  rowsOf,
  sumOf,
  totalOf,
  type Amounts,
  type Row,
  type RowKind,
} from "../what-if-model";

type Load = (query: BaseQuery) => Promise<WhatIfBaseState>;

/** Una cuenta para elegir de dónde sale lo simulado: el efectivo o una tarjeta. */
export interface SourceAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  last4: string | null;
  /** El saldo de hoy, como lo da `GET /v1/accounts`. */
  balance: string;
}

/** El ícono y el color de una categoría, de `GET /v1/categories`. */
export interface CategoryLook {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const PERIODS: readonly PeriodType[] = ["monthly", "semi_monthly", "weekly"];
/** Al soltar un slider o dejar de escribir, la base se refresca con la API. */
const REFRESH_MS = 500;

const field =
  "focus-ring bg-field border-line h-12 w-full rounded-[16px] border px-3 text-sm font-semibold";

const accents: Record<RowKind, string> = {
  expense: "var(--mm-coral)",
  income: "var(--mm-green)",
  goal: "var(--mm-primary)",
};

/** El fondo suave del ícono: el color de la categoría o el de su tipo, al 16 %. */
const soft = (color: string) => `color-mix(in srgb, ${color} 16%, transparent)`;

/**
 * What If? como simulador (spec 009 del back, RF-20 a RF-23): las 3 categorías
 * de gasto y de ingreso con mayor monto del periodo, "Otros" con el resto y las
 * metas, cada una con un slider y un campo para escribir el monto. El total se
 * calcula al instante en el cliente, siempre en `Decimal` y en una sola moneda.
 * No se guarda nada.
 */
export function WhatIfSimulator({
  load,
  initial,
  initialError,
  currencies,
  accounts,
  categories = [],
  balances = {},
  defaultPeriod,
  hidden,
}: {
  load: Load;
  initial: WhatIfBase | null;
  initialError?: string;
  currencies: CurrencyInfo[];
  accounts: SourceAccount[];
  categories?: CategoryLook[];
  /** El saldo de hoy de cada moneda (`GET /v1/balances`): no se suma en el cliente. */
  balances?: Readonly<Record<string, string>>;
  defaultPeriod: PeriodType;
  hidden: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.scenarios;
  const catalog = useMemo(() => new CurrencyCatalog(currencies), [currencies]);
  // Solo las monedas en las que tiene cuentas; sin cuentas todavía, Mis monedas.
  const owned = catalog.mine.filter((c) => accounts.some((a) => a.currency === c.code));
  const mine = owned.length > 0 ? owned : catalog.mine;
  const [query, setQuery] = useState<BaseQuery>({
    currency: initial?.currency ?? catalog.main?.code ?? mine[0]?.code ?? "",
    period_type: initial?.period_type ?? defaultPeriod,
    account_id: null,
  });
  const [base, setBase] = useState(initial);
  const [error, setError] = useState(initialError);
  const [amounts, setAmounts] = useState<Amounts>({});
  // Lo que se está escribiendo en cada campo, tal cual, hasta salir del campo.
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const [pending, startTransition] = useTransition();
  // Solo vale la última respuesta: una más vieja que llega tarde se descarta.
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const reset = () => {
    setAmounts({});
    setDrafts({});
  };

  const fetchBase = (next: BaseQuery, keepAmounts: boolean) => {
    const id = ++latest.current;
    startTransition(async () => {
      const state = await load(next);
      if (id !== latest.current) return;
      setError(state.error);
      if (state.base) setBase(state.base);
      if (!keepAmounts) reset();
    });
  };

  const change = (patch: Partial<BaseQuery>) => {
    clearTimeout(timer.current);
    const next = { ...query, ...patch };
    setQuery(next);
    fetchBase(next, false);
  };

  const setAmount = (row: Row, amount: string) => {
    setAmounts((current) => ({ ...current, [row.key]: amount }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchBase(query, true), REFRESH_MS);
  };

  const leave = (row: Row) =>
    setDrafts((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== row.key)),
    );

  const rows = useMemo(() => (base ? rowsOf(base) : []), [base]);
  const decimals = catalog.decimalsOf(base?.currency ?? query.currency);
  // Un solo cálculo para todos los sliders.
  const total = useMemo(() => totalOf(rows, amounts, decimals), [rows, amounts, decimals]);
  const real = useMemo(() => totalOf(rows, {}, decimals), [rows, decimals]);
  const difference = new Decimal(total).minus(real);
  const changed = Object.entries(amounts).some(([key, amount]) => {
    const row = rows.find((r) => r.key === key);
    return row !== undefined && !new Decimal(amount).eq(row.base);
  });

  const type = (row: Row, text: string) => {
    setDrafts((current) => ({ ...current, [row.key]: text }));
    const amount = parseAmount(text, { decimals, allowZero: true });
    if (amount !== null) setAmount(row, amount);
  };

  const currency = base?.currency ?? query.currency;
  const money = (amount: string, sign?: "+" | "−") =>
    formatMoney(amount, currency, catalog, { hidden, sign });
  const label = catalog.labelOf(currency);
  const sources = accounts.filter((a) => a.currency === query.currency);
  // Cómo vas en general: el saldo de hoy (de la cuenta elegida o de la moneda)
  // más lo que mueve el simulador.
  const today = query.account_id
    ? sources.find((a) => a.id === query.account_id)?.balance
    : balances[currency];
  const general = today === undefined ? null : new Decimal(today).plus(difference);
  const looks = useMemo(() => {
    const byKey = new Map<string, CategoryLook>();
    for (const c of categories) {
      byKey.set(c.id, c);
      byKey.set(c.name.trim().toLowerCase(), c);
    }
    return byKey;
  }, [categories]);

  const nameOf = (row: Row) =>
    row.others
      ? row.kind === "expense"
        ? t.otherExpenses
        : t.otherIncome
      : (row.name ?? t.noCategory);

  /** El cuadro con el ícono: el de la categoría, "⋯" para Otros y 🎯 para una meta. */
  const glyph = (row: Row, name: string) => {
    const id = row.key.slice(row.key.indexOf(":") + 1);
    const look = looks.get(id) ?? looks.get(name.trim().toLowerCase());
    const color = look?.color ?? accents[row.kind];
    const icon = row.kind === "goal" ? "🎯" : row.others ? "⋯" : categoryGlyph(look?.icon, name);
    return (
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-[14px] text-lg font-extrabold"
        style={{ background: soft(color), color }}
      >
        {icon}
      </span>
    );
  };

  const slider = (row: Row, note?: ReactNode) => {
    const amount = amountOf(row, amounts, decimals);
    const position = positionFor(row, amount);
    const ratio = new Decimal(amount).div(row.reference).toDecimalPlaces(2);
    const x = formatNumber(ratio.toString(), 2);
    const id = `whatif-${row.key.replace(/[^a-zA-Z0-9-]/g, "-")}`;
    const name = nameOf(row);
    const { min, max } = RANGE[row.kind];
    // La parte pintada de la barra llega hasta el slider, como las barras del Money Flow.
    const fill = `${((position - min) / (max - min)) * 100}%`;
    return (
      <li key={row.key} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-[min(100%,11rem)] flex-1 items-center gap-3">
            {glyph(row, name)}
            <div className="min-w-0 flex-1">
              <label
                htmlFor={id}
                className="block text-sm leading-snug font-bold [overflow-wrap:anywhere]"
              >
                {name}
              </label>
              {note && <p className="text-xs font-semibold">{note}</p>}
            </div>
          </div>
          <span className="bg-field border-line focus-within:outline-primary-text ml-auto flex h-11 w-[8.5rem] max-w-full shrink-0 items-center gap-1 rounded-[14px] border px-2.5 outline-offset-2 focus-within:outline-2 max-[380px]:w-[7.25rem]">
            <span className="text-muted text-xs font-bold" aria-hidden="true">
              {label}
            </span>
            <input
              type="text"
              inputMode="decimal"
              aria-label={t.amountOf(name)}
              value={drafts[row.key] ?? (hidden ? "" : formatNumber(amount, decimals))}
              placeholder={hidden ? HIDDEN_AMOUNT : "0"}
              onChange={(e) => type(row, e.target.value)}
              onBlur={() => leave(row)}
              className="num w-full min-w-0 bg-transparent text-right text-[15px] font-extrabold outline-none"
              data-testid={`${id}-amount`}
            />
          </span>
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={position}
          aria-valuetext={t.sliderText(name, money(amount), x)}
          onChange={(e) => {
            leave(row);
            setAmount(row, amountAt(row, Number(e.target.value), decimals));
          }}
          className="whatif-slider focus-ring"
          style={{ "--tone": accents[row.kind], "--fill": fill } as CSSProperties}
          data-testid={id}
        />
      </li>
    );
  };

  const group = (kind: "expense" | "income") => {
    const sum = sumOf(rows, amounts, kind, decimals);
    return (
      <GlassCard aria-labelledby={`whatif-${kind}-title`}>
        <div id={`whatif-${kind}-title`}>
          <CardTitle
            action={
              <span
                className={cx(
                  "num text-sm font-extrabold",
                  kind === "expense" ? "text-coral-text" : "text-green-text",
                )}
              >
                {money(sum, kind === "expense" ? "−" : "+")}
              </span>
            }
          >
            {kind === "expense" ? t.expenses : t.income}
          </CardTitle>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {rows.filter((r) => r.kind === kind).map((row) => slider(row))}
        </ul>
      </GlassCard>
    );
  };

  const goalRows = rows.filter((r) => r.kind === "goal");

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold" id="whatif-period">
              {t.period}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="whatif-period"
              className="glass flex flex-wrap gap-1 rounded-3xl p-1"
            >
              {PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  role="radio"
                  aria-checked={query.period_type === period}
                  onClick={() => query.period_type !== period && change({ period_type: period })}
                  className={cx(
                    "focus-ring min-h-10 flex-1 rounded-[20px] px-3 text-sm font-bold whitespace-nowrap",
                    query.period_type === period
                      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                      : "text-ink-2",
                  )}
                >
                  {t.periods[period]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:contents">
            {mine.length > 0 && (
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="whatif-currency" className="text-xs font-bold">
                  {t.currency}
                </label>
                <select
                  id="whatif-currency"
                  value={query.currency}
                  onChange={(e) => change({ currency: e.target.value, account_id: null })}
                  className={field}
                >
                  {mine.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="whatif-source" className="text-xs font-bold">
                {t.source}
              </label>
              <select
                id="whatif-source"
                value={query.account_id ?? ""}
                onChange={(e) => change({ account_id: e.target.value || null })}
                className={field}
              >
                <option value="">{t.allAccounts}</option>
                {(["cash", "card"] as const).map((kind) => {
                  const list = sources.filter((a) => (kind === "card") === (a.type === "card"));
                  return list.length === 0 ? null : (
                    <optgroup key={kind} label={t.accountKinds[kind]}>
                      {list.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.last4 ? `${a.name} ••${a.last4}` : a.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
        <section
          aria-live="polite"
          aria-busy={pending}
          className="bg-well rounded-[20px] px-4 py-3 sm:px-5 sm:py-4"
          data-testid="whatif-total"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-extrabold">{t.total}</h2>
            {base && (
              <span className="text-muted text-xs font-semibold">
                {t.range(
                  shortDate(base.period_starts_on, i18n.locale),
                  shortDate(base.period_ends_on, i18n.locale),
                )}
              </span>
            )}
          </div>
          {error ? (
            <p role="alert" className="text-coral-text mt-1 text-sm font-bold">
              {scenarioErrorText(error, i18n.locale)}
            </p>
          ) : base ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p
                  className={cx(
                    "num text-[34px] leading-tight font-extrabold sm:text-[40px]",
                    new Decimal(total).isNegative() && "text-coral-text",
                  )}
                  data-testid="whatif-total-amount"
                >
                  {money(total)}
                </p>
                {changed && !difference.isZero() && (
                  <span
                    className={cx(
                      "num rounded-full px-2.5 py-1 text-xs font-extrabold",
                      difference.isNegative()
                        ? "bg-coral-soft text-coral-text"
                        : "bg-green-soft text-green-text",
                    )}
                    data-testid="whatif-difference"
                  >
                    {t.vsReal(
                      money(difference.abs().toString(), difference.isNegative() ? "−" : "+"),
                    )}
                  </span>
                )}
              </div>
            </>
          ) : null}
          {base && !error && general && today !== undefined && (
            <div
              className="border-line mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3"
              data-testid="whatif-general"
            >
              <h3 className="text-sm font-extrabold">{t.general}</h3>
              <p className="flex flex-wrap items-baseline gap-x-2">
                {changed && !difference.isZero() && (
                  <span className="text-muted text-xs font-semibold">
                    {t.generalToday(money(today))}
                  </span>
                )}
                <span
                  className={cx(
                    "num text-xl font-extrabold",
                    general.isNegative() && "text-coral-text",
                  )}
                  data-testid="whatif-general-amount"
                >
                  {money(general.toFixed(decimals))}
                </span>
              </p>
            </div>
          )}
          {changed && (
            <button
              type="button"
              onClick={reset}
              className="focus-ring text-primary-text mt-2 rounded-lg text-sm font-bold"
            >
              {t.reset}
            </button>
          )}
        </section>
      </GlassCard>
      {base && (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {group("expense")}
            {group("income")}
          </div>
          <GlassCard aria-labelledby="whatif-goals-title">
            <div id="whatif-goals-title">
              <CardTitle>{t.goals}</CardTitle>
            </div>
            {goalRows.length === 0 ? (
              <p className="text-muted mt-2 text-sm">{t.noGoals}</p>
            ) : (
              <>
                <ul className="mt-4 grid gap-x-8 gap-y-3 lg:grid-cols-2">
                  {goalRows.map((row) => {
                    const goal = base.goals.find((g) => `goal:${g.goal_id}` === row.key);
                    const amount = amountOf(row, amounts, decimals);
                    const months = goal
                      ? goalMonthsLeft(goal, amount, base.periods_per_year)
                      : null;
                    return slider(
                      row,
                      <span className={months === null ? "text-coral-text" : "text-muted"}>
                        {months === null ? t.goalNever : t.goalWhen(months)}
                      </span>,
                    );
                  })}
                </ul>
              </>
            )}
          </GlassCard>
        </>
      )}
      <p className="text-muted text-xs">{t.nothingSaved}</p>
    </div>
  );
}
