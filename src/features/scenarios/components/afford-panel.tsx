"use client";

import { PlanLimitCard } from "@/features/billing/components/plan-limit-card";
import type { PlanLimit } from "@/features/billing/plan-limits";
import Decimal from "decimal.js";
import { useActionState, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";
import { monthYear, shortDate } from "@/lib/dates";
import { scenarioErrorText } from "@/lib/i18n/scenarios-messages";
import { CurrencyCatalog, type CurrencyInfo } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";
import { parseAmount } from "@/lib/money/parse";

import type { Affordability } from "../data/scenarios-gateway";
import type { AffordState } from "../scenarios-actions";
import { AffordabilityCurve } from "./affordability-curve";

import { useMessages } from "@/lib/i18n/client";
type Action = (state: AffordState, form: FormData) => Promise<AffordState>;

const field =
  "focus-ring bg-field border-line h-12 w-full rounded-[16px] border px-3 text-sm font-semibold";
const fieldLabel = "text-muted text-xs font-semibold";

/**
 * Can I Afford It? (spec 005, RF-10 a RF-18): arriba, una sola barra con el
 * precio, la moneda (solo las configuradas, sin convertir) y una categoría
 * opcional; abajo, la respuesta de la API. La web no decide nada.
 */
export function AffordPanel({
  action,
  currencies,
  accountCurrencies = [],
  categories,
  hidden,
  checks = null,
}: {
  action: Action;
  currencies: CurrencyInfo[];
  /** Las monedas en las que tiene cuentas: solo esas se ofrecen. */
  accountCurrencies?: readonly string[];
  categories: { id: string; name: string }[];
  hidden: boolean;
  /** MM-188: las consultas del mes según el plan; `full` sin ninguna libre. */
  checks?: { limit: PlanLimit; full: boolean } | null;
}) {
  const i18n = useMessages();
  const t = i18n.scenarios;
  const plansMessages = i18n.plans;
  const [state, formAction, pending] = useActionState(action, {});
  const catalog = useMemo(() => new CurrencyCatalog(currencies), [currencies]);
  // Solo la moneda configurada; si tiene cuentas en más, recién se ofrecen las otras.
  const owned = catalog.mine.filter((c) => accountCurrencies.includes(c.code));
  const main = catalog.main;
  const mine = owned.length > 0 ? owned : main ? [main] : [];
  const [currency, setCurrency] = useState(mine[0]?.code ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const decimals = catalog.decimalsOf(currency);
  const valid = parseAmount(amount, { decimals }) !== null;

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="glass flex flex-col gap-3 rounded-[26px] p-4 sm:p-5"
        noValidate
      >
        <input type="hidden" name="decimals" value={decimals} />
        <div
          className={cx(
            "grid items-end gap-3",
            mine.length > 1
              ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              : "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]",
          )}
        >
          <TextField
            label={`${t.amount} (${catalog.labelOf(currency)})`}
            name="amount"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {mine.length > 1 ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="afford-currency" className={fieldLabel}>
                {t.currency}
              </label>
              <select
                id="afford-currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={field}
              >
                {mine.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="currency" value={currency} />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="afford-category" className={fieldLabel}>
              {t.category}
            </label>
            <select
              id="afford-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
            >
              <option value="">{t.noCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!checks?.full && (
            <Button type="submit" size="md" disabled={pending || !valid} className="md:px-8">
              {pending ? t.analyzing : t.analyze}
            </Button>
          )}
        </div>
        {checks?.full ? (
          <PlanLimitCard limit={checks.limit} />
        ) : (
          <p className="text-muted flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
            {checks && (
              <span data-testid="afford-checks-left" className="font-semibold">
                {plansMessages.checksLeft(
                  checks.limit.limit - checks.limit.used,
                  checks.limit.limit,
                )}
              </span>
            )}
            <span>{t.nothingSaved}</span>
          </p>
        )}
      </form>
      <section aria-live="polite" data-testid="afford-result">
        {state.error ? (
          <p role="alert" className="glass text-coral-text rounded-[26px] p-5 text-sm font-bold">
            {scenarioErrorText(state.error, i18n.locale)}
          </p>
        ) : state.result ? (
          <AffordResult result={state.result} catalog={catalog} hidden={hidden} />
        ) : (
          <div className="border-line flex items-center gap-3 rounded-[26px] border border-dashed p-5">
            <span
              aria-hidden="true"
              className="bg-primary-soft text-primary-text grid size-11 shrink-0 place-items-center rounded-full"
            >
              <Icon name="scenarios" />
            </span>
            <p className="text-muted text-sm">{t.affordEmpty}</p>
          </div>
        )}
      </section>
    </div>
  );
}

/** Una fila del desglose: etiqueta a la izquierda, monto con su signo a la derecha. */
function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-xs">
      <dt className={bold ? "text-green-text font-extrabold" : "text-muted font-medium"}>
        {label}
      </dt>
      <dd
        className={cx(
          "num text-right [overflow-wrap:anywhere]",
          bold ? "text-green-text font-extrabold" : "font-semibold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Note({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="bg-primary-soft flex items-center gap-2 rounded-2xl p-3 text-sm font-bold">
      <Icon name={icon} className="text-primary-text size-[18px]" />
      <span>{children}</span>
    </p>
  );
}

/** Una de las tres cifras clave: precio, disponible y lo que queda o falta. */
function Figure({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone?: string;
  testId?: string;
}) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-[18px] border px-2.5 py-2 sm:px-3 sm:py-2.5",
        tone?.includes("green")
          ? "bg-green-soft border-transparent"
          : tone
            ? "bg-amber-soft border-transparent"
            : "bg-well border-transparent",
      )}
    >
      <dt className="text-muted text-[11px] font-semibold sm:text-xs">{label}</dt>
      <dd
        className={cx("num text-[15px] font-extrabold [overflow-wrap:anywhere] sm:text-xl", tone)}
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * La respuesta de Can I Afford It? (PRD §6.13): arriba lo importante (si
 * alcanza, tres cifras y, si no, cuándo y la proyección); el detalle del
 * cálculo, plegado. Informa, nunca decide (spec 005, RF-11 a RF-15).
 */
function AffordResult({
  result,
  catalog,
  hidden,
}: {
  result: Affordability;
  catalog: CurrencyCatalog;
  hidden: boolean;
}) {
  const i18n = useMessages();
  const t = i18n.scenarios.res;
  const money = (amount: string, sign?: "+" | "−") =>
    formatMoney(amount, result.currency, catalog, { hidden, sign });
  const fits = result.verdict === "affordable";
  const missing = new Decimal(result.available_after).neg().toString();
  const estimatedOn = result.estimated_on;
  const b = result.breakdown;
  const a = result.assumptions;
  const month = (iso: string) => monthYear(iso, i18n.locale);
  const curve = !fits && estimatedOn && result.projection.length >= 2;

  return (
    <div className="glass flex flex-col gap-4 rounded-[26px] p-4 sm:p-6">
      <div
        className={cx(
          "flex items-center gap-3 rounded-[20px] p-3 sm:p-4",
          fits ? "bg-green-soft" : "bg-amber-soft",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "grid size-11 shrink-0 place-items-center rounded-full text-white",
            fits ? "bg-green" : "bg-amber",
          )}
        >
          <Icon name={fits ? "check" : "warning"} className="size-[22px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-extrabold">
            {fits ? t.yesTitle : t.notYetTitle}
          </h2>
          <p
            className={cx(
              "text-[13px] font-semibold",
              fits ? "text-green-text" : "text-amber-text",
            )}
            data-testid="afford-headline"
          >
            {fits ? t.yesLeft(money(result.available_after)) : t.notYetMissing(money(missing))}
          </p>
        </div>
      </div>

      <div
        className={cx(
          "grid items-center gap-4",
          curve && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]",
        )}
      >
        <div className="flex flex-col gap-3">
          <dl className={cx("grid grid-cols-3 gap-2", curve && "lg:grid-cols-1")}>
            <Figure label={t.price} value={money(result.amount)} />
            <Figure
              label={t.availableShort}
              value={money(result.available)}
              testId="afford-available"
            />
            <Figure
              label={fits ? t.leftShort : t.missingShort}
              value={money(fits ? result.available_after : missing)}
              tone={fits ? "text-green-text" : "text-amber-text"}
            />
          </dl>
          {!fits && (
            <Note icon="calendar">
              {estimatedOn ? t.notYetWhen(month(estimatedOn)) : t.notYetNoSurplus}
            </Note>
          )}
        </div>
        {curve && estimatedOn && (
          <AffordabilityCurve
            points={result.projection}
            amount={result.amount}
            todayLabel={t.curveToday}
            todayTag={money(result.available)}
            priceTag={t.priceTag(money(result.amount))}
            tickLabel={(iso) => monthYear(iso, i18n.locale, true).replace(".", "")}
            savingsLabel={t.curveSavings}
            priceLabel={t.curvePrice}
            label={t.curveLabel(money(a.monthly_surplus), money(result.amount), month(estimatedOn))}
          />
        )}
      </div>

      <details className="group border-line rounded-2xl border" data-testid="afford-details">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          {t.seeDetail}
          <Icon
            name="chevron"
            className="text-muted size-4 transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3">
          {curve && <p className="text-muted text-[11px]">{t.curveNote}</p>}
          {a.limited_history && <Note icon="info">{t.limitedHistory}</Note>}
          <div className="grid items-start gap-3 md:grid-cols-2">
            <section
              className="bg-primary-soft rounded-2xl px-3 py-2.5"
              data-testid="afford-breakdown"
            >
              <h3 className="text-[13px] font-bold">{t.available}</h3>
              <dl className="mt-1.5">
                <Line label={t.balance} value={money(b.current_balance)} />
                <Line label={t.pending} value={money(b.pending_recurring, "−")} />
                <Line label={t.plannedSavings} value={money(b.planned_savings, "−")} />
                <Line label={t.goalContributions} value={money(b.goal_contributions, "−")} />
                <hr className="border-line my-1.5" />
                <Line label={t.safeToSpend} value={money(result.safe_to_spend)} bold />
                <Line label={t.incomeInPeriod} value={money(result.income_in_period, "+")} />
                <Line
                  label={t.variableLeft}
                  value={money(result.remaining_variable_spending, "−")}
                />
              </dl>
              <p className="text-muted mt-1 text-[10px]">{t.breakdownNote}</p>
            </section>
            <section className="bg-well rounded-2xl px-3 py-2.5" data-testid="afford-monthly">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold">{t.monthly}</h3>
                <span className="text-muted text-right text-[10px]">
                  {t.period(
                    shortDate(a.period_starts_on, i18n.locale),
                    shortDate(a.period_ends_on, i18n.locale),
                  )}
                </span>
              </div>
              <dl className="mt-1.5">
                <Line label={t.monthlyIncome} value={money(a.monthly_income, "+")} />
                <Line label={t.monthlyExpenses} value={money(a.monthly_expenses, "−")} />
                <Line label={t.monthlyGoals} value={money(a.monthly_goals, "−")} />
                <Line label={t.monthlySavings} value={money(a.monthly_planned_savings, "−")} />
                <hr className="border-line my-1.5" />
                <Line label={t.monthlySurplus} value={money(a.monthly_surplus)} bold />
              </dl>
              <p className="text-muted mt-1 text-[10px]">{t.estimate}</p>
            </section>
          </div>
          {!fits && result.goal_impacts.length > 0 && (
            <div>
              <p className="text-muted text-xs font-bold">{t.goalsInfo}</p>
              <ul className="flex flex-col">
                {result.goal_impacts.map((g) => (
                  <li key={g.goal_id} className="flex items-center gap-2.5 pt-2.5">
                    <Icon name="flag" className="text-muted size-5" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{g.name}</span>
                      <span className="text-muted num block text-xs">{money(g.amount)}</span>
                    </span>
                    <span
                      className={cx(
                        "text-right text-sm font-bold",
                        g.delay_months !== null && g.delay_months > 0
                          ? "text-coral-text"
                          : "text-muted",
                      )}
                    >
                      {g.delay_months === null ? t.goalNoPace : t.goalDelay(g.delay_months)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
