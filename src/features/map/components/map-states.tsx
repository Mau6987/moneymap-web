import Link from "next/link";

import { ButtonLink } from "@/components/button";
import { GlassCard, ProgressTrack } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { DueList } from "@/features/recurring/components/due-list";
import type { RecurringRule } from "@/features/recurring/data/recurring-gateway";
import type { Account } from "@/features/transactions/data/transactions-gateway";
import { monthYear } from "@/lib/dates";

import { formatMoney } from "@/lib/money/money";

import type { Position } from "../data/map-gateway";
import { monthEnd, recentMonths } from "../domain/map";
import type { CurrencyBlock } from "../map-data";
import type { MoneyView } from "./map-cards";

import { useServerMessages } from "@/lib/i18n/server";
/** "Todas" (spec 004, RF-3): un bloque por moneda, nunca un total que las sume. */
export function AllCurrencies({ blocks, view }: { blocks: CurrencyBlock[]; view: MoneyView }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  return (
    <section aria-labelledby="map-all-title" data-testid="map-all" className="flex flex-col gap-3">
      <p id="map-all-title" className="text-muted text-sm font-semibold">
        {t.allNote}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map(({ safeToSpend: sts, position, balance }) => {
          const info = view.catalog.get(sts.currency);
          const amount = (value: string, sign?: "+" | "−") =>
            formatMoney(value, sts.currency, view.catalog, { hidden: view.hidden, sign });
          return (
            <Link
              key={sts.currency}
              href={`/map?currency=${sts.currency}`}
              data-testid={`map-all-${sts.currency}`}
              className="glass focus-ring rounded-[26px] p-4 sm:px-[22px] sm:py-5"
            >
              <h2 className="text-muted text-xs font-bold">
                {sts.currency} · {info?.name ?? sts.currency}
                {balance.is_main_currency ? ` · ${t.main.toLowerCase()}` : ""}
              </h2>
              <p className="mt-2 text-2xl font-extrabold tabular-nums">{amount(sts.amount)}</p>
              <p className="text-muted text-xs font-semibold">
                {t.safeToSpend} · {t.free}
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 text-sm font-bold">
                <span className="text-green-text">{amount(position.income, "+")}</span>
                <span className="text-coral-text">{amount(position.expenses, "−")}</span>
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Spec 004, RF-5: sin movimientos ni dinero en el periodo, el Map vacío. */
export function EmptyMap({ label }: { label: string }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  return (
    <GlassCard data-testid="map-empty">
      <p className="text-3xl font-extrabold">{label} —</p>
      <h2 className="mt-2 text-lg font-extrabold">{t.emptyTitle}</h2>
      <p className="text-muted mt-1 text-sm">{t.emptyBody}</p>
    </GlassCard>
  );
}

/**
 * "Completa tu mapa" (mockup "10d · Map · sin datos"), como en la app: los
 * pasos para un Map sin movimientos, con los que ya están hechos.
 */
export function SetupCard({ setup }: { setup: { hasIncome: boolean; hasExpenses: boolean } }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const steps = [
    { href: "/recurring/income", text: t.setupIncome, done: setup.hasIncome },
    { href: "/recurring/expenses", text: t.setupExpenses, done: setup.hasExpenses },
    { href: "/add", text: t.setupFirst, done: false },
  ];
  const done = steps.filter((step) => step.done).length;
  return (
    <GlassCard data-testid="map-setup">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">{t.setupTitle}</h2>
        <span className="text-muted text-xs font-semibold">
          {t.setupProgress(done, steps.length)}
        </span>
      </div>
      {/* Como el mockup, una franja verde aun en cero. */}
      <ProgressTrack
        percent={Math.max(4, (done / steps.length) * 100)}
        tone="green"
        label={`${t.setupTitle}: ${t.setupProgress(done, steps.length)}`}
      />
      <ul className="mt-3 flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="focus-ring bg-well flex items-center justify-between gap-2 rounded-[16px] px-4 py-3 text-sm font-bold"
            >
              <span className={step.done ? "text-muted line-through" : undefined}>{step.text}</span>
              {step.done ? (
                <span className="text-green-text flex items-center gap-1 text-xs">
                  <Icon name="check" className="size-4" />
                  {t.setupDone}
                </span>
              ) : (
                <Icon name="chevron" className="size-4" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/**
 * Los gastos fijos que vencen hoy o ya vencieron, con "Pagar", arriba de
 * todo como en la app. No aparece si no hay ninguno.
 */
export function DuePaymentsCard({
  rules,
  today,
  view,
  accounts,
}: {
  rules: RecurringRule[];
  today: string;
  view: MoneyView;
  /** Las cuentas de la moneda, para elegir con cuál pagar (BUG-027). */
  accounts: Account[];
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  if (rules.length === 0) return null;
  return (
    <GlassCard data-testid="map-due" aria-labelledby="map-due-title">
      <h2 id="map-due-title" className="flex items-center gap-2 text-[15px] font-extrabold">
        <span className="text-coral-text">
          <Icon name="bell" />
        </span>
        {t.dueTitle(rules.length)}
      </h2>
      <p className="text-muted mt-1 mb-3 text-xs">{t.dueHint}</p>
      <DueList
        rules={rules}
        today={today}
        catalog={view.catalog}
        hidden={view.hidden}
        back="/map"
        compact
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.last4 ? `${a.name} •• ${a.last4}` : a.name,
          currency: a.currency,
          balance: formatMoney(a.current_balance, a.currency, view.catalog, {
            hidden: view.hidden,
          }),
        }))}
      />
    </GlassCard>
  );
}

/** "/map?month=2026-09&currency=USD": el Map de ese mes, sin perder la moneda. */
function monthHref(month: string | null, currency?: string): string {
  const query = new URLSearchParams();
  if (month) query.set("month", month.slice(0, 7));
  if (currency) query.set("currency", currency);
  const text = query.toString();
  return text ? `/map?${text}` : "/map";
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * El chip del mes en la barra del Map, como en la app: abre los últimos 12
 * meses; el actual vuelve al periodo de hoy y otro muestra su resumen.
 */
export function MonthChip({
  today,
  shown,
  currency,
}: {
  today: string;
  /** El mes pasado que se ve, o null en el de hoy. */
  shown: string | null;
  currency?: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const months = recentMonths(today);
  const current = months[0]!;
  return (
    // La key lo vuelve a cerrar al elegir un mes.
    <details key={shown ?? "now"} className="relative" data-testid="map-month">
      <summary
        aria-label={t.monthPicker}
        className="glass focus-ring inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-[13px] font-bold [&::-webkit-details-marker]:hidden"
      >
        <Icon name="calendar" className="size-4" />
        {capitalized(monthYear(shown ?? current, i18n.locale, true).replace(".", ""))}
      </summary>
      <ul className="border-line absolute top-12 right-0 z-30 flex max-h-80 w-64 flex-col overflow-y-auto rounded-[20px] border bg-[var(--mm-bg)] p-1.5 shadow-[var(--mm-shadow)]">
        {months.map((month) => {
          const on = shown ? shown === month : month === current;
          const name = capitalized(monthYear(month, i18n.locale));
          return (
            <li key={month}>
              <Link
                href={monthHref(month === current ? null : month, currency)}
                aria-current={on ? "page" : undefined}
                className="focus-ring hover:bg-well flex items-center justify-between rounded-[14px] px-3 py-2.5 text-sm font-semibold"
              >
                {month === current ? t.thisMonth(name) : name}
                {on && <Icon name="check" className="text-primary-text size-4" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/**
 * Un mes pasado (como el BUG-025 de la app): lo que entró, salió, se ahorró y
 * el saldo al cierre, con sus movimientos y la vuelta al mes actual. Safe to
 * Spend, Por pagar y el Forecast son del periodo actual: acá no van.
 */
export function PastMonth({
  month,
  currency,
  position,
  view,
}: {
  month: string;
  currency: string;
  position: Position;
  view: MoneyView;
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const name = capitalized(monthYear(month, i18n.locale));
  const rows: [string, string, "+" | "−" | undefined][] = [
    [t.income, position.income, "+"],
    [t.expenses, position.expenses, "−"],
    [t.goals, position.saved, undefined],
  ];
  const movements = new URLSearchParams({
    date: "range",
    from: month,
    to: monthEnd(month),
    currency,
  });
  const amount = (value: string, sign?: "+" | "−") =>
    formatMoney(value, currency, view.catalog, { hidden: view.hidden, sign });
  return (
    <section data-testid="map-past-month" className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-extrabold">{name}</h2>
        <p className="text-muted mt-1 text-xs">{t.pastMonthNote}</p>
      </div>
      <GlassCard>
        <dl className="flex flex-col">
          {rows.map(([label, value, sign]) => (
            <div key={label} className="flex justify-between gap-3 py-1.5 text-sm">
              <dt>{label}</dt>
              <dd className="font-extrabold tabular-nums">{amount(value, sign)}</dd>
            </div>
          ))}
          <div className="border-line mt-2 flex justify-between gap-3 border-t pt-3 text-sm">
            <dt>{t.pastMonthBalance}</dt>
            <dd className="font-extrabold tabular-nums">{amount(position.available_balance)}</dd>
          </div>
        </dl>
      </GlassCard>
      <ButtonLink href={`/transactions?${movements.toString()}`} size="md">
        {t.pastMonthMovements(name)}
      </ButtonLink>
      <ButtonLink href={monthHref(null, currency)} variant="ghost" size="md">
        {t.backToNow}
      </ButtonLink>
    </section>
  );
}

/** Sin cuentas todavía: no hay Safe to Spend, solo la invitación. */
export function NoAccounts() {
  const i18n = useServerMessages();
  const t = i18n.map;
  return (
    <GlassCard data-testid="map-no-accounts">
      <h2 className="text-lg font-extrabold">{t.noAccountsTitle}</h2>
      <p className="text-muted mt-1 text-sm">{t.noAccountsBody}</p>
      <ButtonLink href="/accounts" size="md" className="mt-4">
        {t.addAccount}
      </ButtonLink>
    </GlassCard>
  );
}

/** Spec 004, RF-15: un error con reintento, nunca un Map en ceros. */
export function MapError({ retryHref }: { retryHref: string }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  return (
    <GlassCard role="alert" data-testid="map-error">
      <h2 className="text-lg font-extrabold">{t.error}</h2>
      <p className="text-muted mt-1 text-sm">{t.errorBody}</p>
      <ButtonLink href={retryHref} size="md" className="mt-4">
        {t.retry}
      </ButtonLink>
    </GlassCard>
  );
}
