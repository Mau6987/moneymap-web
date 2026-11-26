import Link from "next/link";
import type { ReactNode } from "react";

import { Pill, ProgressTrack } from "@/components/glass-card";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";

import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney, shareOf } from "@/lib/money/money";

import type { Budget, Forecast, MoneyFlow } from "../data/map-gateway";
import { daysLeft, isNegative, periodElapsed, ringParts } from "../domain/map";
import type { CurrencyBlock } from "../map-data";

import type { Messages } from "@/lib/i18n/catalog";
import { useServerMessages } from "@/lib/i18n/server";
/** Cómo se escriben los montos en esta pantalla: el catálogo y el modo privado. */
export interface MoneyView {
  catalog: CurrencyCatalog;
  hidden: boolean;
}

const money = (view: MoneyView, amount: string, currency: string, sign?: "+" | "−") =>
  formatMoney(amount, currency, view.catalog, { hidden: view.hidden, sign });

/** Una tarjeta del Map que lleva a su pantalla. */
function CardLink({
  href,
  title,
  aside,
  children,
  testId,
  className = "",
}: {
  href: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cx(
        "glass focus-ring block min-w-0 rounded-[26px] p-4 sm:px-[22px] sm:py-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2.5 text-[15px] font-extrabold">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </Link>
  );
}

/**
 * El tamaño del monto dentro del anillo: "Bs 1.000" entra grande, pero
 * "Bs 12.345,67" tiene que achicarse para no pisar el borde (MM-181).
 */
export function ringText(amount: string): string {
  if (amount.length <= 8) return "text-[22px]";
  if (amount.length <= 11) return "text-lg";
  return "text-[15px]";
}

/**
 * El anillo alrededor del total: sus partes una tras otra desde arriba. Lo
 * libre en verde; lo que falta pagar y lo gastado en rojo. Solo dibuja.
 */
export function Ring({ parts }: { parts: { share: number; stroke: string; testId: string }[] }) {
  const length = 2 * Math.PI * 52;
  let start = 0;
  return (
    <svg viewBox="0 0 120 120" className="size-[148px] shrink-0 -rotate-90" aria-hidden="true">
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        strokeWidth="12"
        className="stroke-[var(--mm-well)]"
      />
      {parts.map(({ share, stroke, testId }) => {
        if (share <= 0) return null;
        const offset = start;
        start += share;
        return (
          <circle
            key={testId}
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="12"
            className={stroke}
            strokeDasharray={`${(share * length).toFixed(1)} ${length.toFixed(1)}`}
            strokeDashoffset={(-offset * length).toFixed(1)}
            data-testid={testId}
          />
        );
      })}
    </svg>
  );
}

/**
 * Spec 003 RF-1 a RF-9 y spec 004 RF-1: lo libre del periodo, con lo que
 * entró, lo que salió y las cuentas por pagar del periodo (como en la app).
 */
export function SafeToSpendCard({
  block,
  view,
  today,
  isMain,
}: {
  block: CurrencyBlock;
  view: MoneyView;
  today: string;
  isMain: boolean;
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const { safeToSpend: sts, position } = block;
  const currency = sts.currency;
  const negative = isNegative(sts);
  const status = negative ? t.negative : t.onTrack(daysLeft(sts.period_ends_on, today));
  const parts = ringParts(sts, position);
  // En el centro, el total de las cuentas: lo que hay, con los gastos ya
  // restados; lo libre es la parte verde y su desglose se abre con un toque.
  const total = sts.breakdown.current_balance;
  return (
    <CardLink
      href={`/safe-to-spend?currency=${currency}`}
      title={t.safeToSpend}
      testId="map-safe-to-spend"
      aside={<Pill tone={negative ? "coral" : "green"}>{negative ? t.overspent : status}</Pill>}
    >
      <div className="flex items-center gap-5">
        <div className="relative grid place-items-center">
          <Ring
            parts={[
              { share: parts.free, stroke: "stroke-[var(--mm-green)]", testId: "map-ring-free" },
              {
                share: parts.payables,
                stroke: "stroke-[var(--mm-coral)]",
                testId: "map-ring-payables",
              },
              { share: parts.spent, stroke: "stroke-[var(--mm-coral)]", testId: "map-ring-spent" },
            ]}
          />
          <span className="absolute max-w-[104px] text-center">
            <span
              className={cx(
                "block font-extrabold tabular-nums",
                ringText(money(view, total, currency)),
                total.startsWith("-") && "text-coral-text",
              )}
              data-testid="map-total-amount"
            >
              {money(view, total, currency)}
            </span>
            <span className="text-muted text-xs font-semibold">{t.total}</span>
          </span>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-3 gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-2">
          <div>
            <dt className="text-muted text-xs font-semibold">{t.income}</dt>
            <dd className="text-green-text font-extrabold">
              {money(view, position.income, currency, "+")}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold">{t.expenses}</dt>
            <dd className="text-coral-text font-extrabold">
              {money(view, position.expenses, currency, "−")}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold">{i18n.payables.title}</dt>
            <dd className="text-coral-text font-extrabold" data-testid="map-payables">
              {money(view, sts.breakdown.pending_recurring, currency)}
            </dd>
          </div>
        </dl>
      </div>
      <p className="text-muted mt-3 text-xs font-semibold">
        {negative
          ? status
          : isMain
            ? t.main
            : t.ofIncome(money(view, sts.amount, currency), money(view, position.income, currency))}
      </p>
    </CardLink>
  );
}

/** "En 30 días": el saldo proyectado de la moneda (spec 010). */
export function ForecastCard({ forecast, view }: { forecast: Forecast; view: MoneyView }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const point = forecast.points.find((p) => p.days === 30) ?? forecast.points[0];
  if (!point) return null;
  const currency = forecast.currency;
  return (
    <CardLink
      href={`/forecast?currency=${currency}`}
      title={t.forecast}
      testId="map-forecast"
      aside={
        <span className="text-muted text-xs font-semibold">
          {t.in30(shortDate(point.on, i18n.locale))}
        </span>
      }
    >
      <p className="text-2xl font-extrabold tabular-nums">{money(view, point.balance, currency)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted text-xs font-semibold">{t.forecastToday}</dt>
          <dd className="font-extrabold">{money(view, forecast.balance, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted text-xs font-semibold">{t.forecastIn}</dt>
          <dd className="text-green-text font-extrabold">
            {money(view, point.recurring_income, currency, "+")}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-xs font-semibold">{t.forecastFixed}</dt>
          <dd className="text-coral-text font-extrabold">
            {money(view, point.recurring_expenses, currency, "−")}
          </dd>
        </div>
      </dl>
      <p className="text-muted mt-3 text-xs font-semibold">
        {forecast.goes_negative_on
          ? t.forecastNegative(shortDate(forecast.goes_negative_on, i18n.locale))
          : t.forecastNote}
      </p>
    </CardLink>
  );
}

/** Spec 004, RF-6: el ingreso y sus cuatro grupos, que suman lo que entró. */
export function MoneyFlowCard({ flow, view }: { flow: MoneyFlow; view: MoneyView }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const { nodes, currency } = flow;
  const rows: [string, string, "coral" | "amber" | "primary" | "green"][] = [
    [t.needs, nodes.needs, "coral"],
    [t.lifestyle, nodes.lifestyle, "amber"],
    [t.goals, nodes.goals, "primary"],
    [t.available, nodes.available, "green"],
  ];
  return (
    <CardLink
      href={`/money-flow?currency=${currency}`}
      title={t.moneyFlow}
      testId="map-money-flow"
      aside={<span className="text-sm font-extrabold">{money(view, nodes.income, currency)}</span>}
    >
      <ul className="flex flex-col gap-2.5">
        {rows.map(([label, amount, tone]) => (
          <li
            key={label}
            className="grid grid-cols-[minmax(0,7.5rem)_minmax(3rem,1fr)_auto] items-center gap-3 text-sm"
          >
            <span className="truncate font-semibold">{label}</span>
            <ProgressTrack
              percent={shareOf(amount, nodes.income) * 100}
              tone={tone}
              label={label}
            />
            <span className="text-right font-extrabold tabular-nums">
              {money(view, amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </CardLink>
  );
}

const paceTone = (b: Budget) =>
  new Map<string | null, "green" | "amber" | "coral">([
    ["on_track", "green"],
    ["a_bit_fast", "amber"],
    ["too_fast", "coral"],
  ]).get(b.pace.status) ?? "green";

const paceLabel = (b: Budget, t: Messages["map"]) =>
  b.remaining.startsWith("-")
    ? t.overspent
    : (
        { on_track: t.paceOnTrack, a_bit_fast: t.paceABitFast, too_fast: t.paceTooFast } as Record<
          string,
          string
        >
      )[b.pace.status ?? ""];

/** Backend spec 009: lo usado de cada presupuesto contra lo que va del mes. */
export function BudgetsCard({ budgets, today }: { budgets: Budget[]; today: string }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const first = budgets[0];
  if (!first) {
    return (
      <CardLink href="/budgets/new" title={t.budgets} testId="map-budgets-empty">
        <p className="text-muted text-sm">{t.budgetsEmpty}</p>
      </CardLink>
    );
  }
  const elapsed = periodElapsed(first.period_starts_on, first.period_ends_on, today);
  return (
    <CardLink
      href="/budgets"
      title={t.budgets}
      testId="map-budgets"
      aside={
        <span className="text-muted text-xs font-semibold">
          {t.monthAt(Math.round(elapsed * 100))}
        </span>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {budgets.map((b) => (
          <li
            key={b.id}
            className="grid grid-cols-[minmax(0,6.5rem)_minmax(3rem,1fr)_auto] items-center gap-3 text-sm"
          >
            <span className="truncate font-semibold">{b.category_name}</span>
            <ProgressTrack
              percent={b.percent_used}
              tone={b.remaining.startsWith("-") ? "coral" : paceTone(b)}
              label={t.budgetUsed(b.category_name, b.percent_used)}
            />
            {paceLabel(b, t) && (
              <Pill tone={b.remaining.startsWith("-") ? "coral" : paceTone(b)}>
                {paceLabel(b, t)}
              </Pill>
            )}
          </li>
        ))}
      </ul>
    </CardLink>
  );
}

/**
 * La entrada a la Money Story desde el Map, aunque los avisos estén apagados
 * (spec 006). No pide nada a la API: la historia se carga al abrirla.
 */
export function MoneyStoryCard({ currency }: { currency: string }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  return (
    <CardLink
      href={`/money-story?currency=${currency}`}
      title={t.storyEntry}
      testId="map-money-story"
      aside={<span className="text-primary-text text-sm font-extrabold">→</span>}
    >
      <p className="text-muted text-sm">{t.storyNote}</p>
    </CardLink>
  );
}
