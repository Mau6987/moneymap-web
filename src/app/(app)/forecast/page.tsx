import { amountsHidden } from "@/lib/privacy";
import Decimal from "decimal.js";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon, type IconName } from "@/components/icon";
import { LineChart } from "@/components/line-chart";
import {
  changeFromToday,
  chartValues,
  HORIZONS,
  isHorizon,
  lowestBalance,
  pointAt,
  type Horizon,
} from "@/features/forecast/domain/forecast";
import { mapGateway } from "@/features/map/data/map-gateway";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";

import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
const pill = (on: boolean) =>
  cx(
    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
    on
      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
      : "glass text-ink-2",
  );

/**
 * Forecast (spec 010 del back; mockups "Web-Forecast" y "Web-Forecast-B";
 * MM-173): el saldo de una moneda a 30, 60 y 90 días y los supuestos de los
 * que sale. Una moneda a la vez, sin sumar ni convertir. Es una estimación,
 * nunca una recomendación.
 */
export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; days?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.forecast;
  const params = await searchParams;
  const days: Horizon = isHorizon(params.days) ? (Number(params.days) as Horizon) : 30;

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(params.currency);
  } catch (error) {
    unstable_rethrow(error);
  }

  const href = (changes: Record<string, string>) =>
    `/forecast?${new URLSearchParams({
      ...(data?.currency ? { currency: data.currency } : {}),
      days: String(days),
      ...changes,
    })}`;

  return (
    <>
      <header>
        <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
        <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {t.title}
        </h1>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href={href({})} size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : !data.forecast || !data.currency ? (
        <GlassCard data-testid="forecast-empty">
          <p className="text-center font-bold">{t.noAccounts}</p>
        </GlassCard>
      ) : (
        <ForecastBody
          {...data}
          forecast={data.forecast}
          currency={data.currency}
          days={days}
          href={href}
        />
      )}
    </>
  );
}

function ForecastBody({
  forecast,
  currency,
  currencies,
  catalog,
  hidden,
  days,
  href,
}: {
  forecast: NonNullable<Awaited<ReturnType<typeof load>>["forecast"]>;
  currency: string;
  currencies: string[];
  catalog: CurrencyCatalog;
  hidden: boolean;
  days: Horizon;
  href: (changes: Record<string, string>) => string;
}) {
  const i18n = useServerMessages();
  const t = i18n.forecast;
  const money = (amount: string, sign?: "+" | "−") =>
    formatMoney(amount, currency, catalog, { hidden, sign });
  const point = pointAt(forecast, days);
  if (!point) return null;
  const change = changeFromToday(forecast, point.balance);
  const up = !new Decimal(change).isNegative();
  const at = (d: Horizon) => money(pointAt(forecast, d)?.balance ?? forecast.balance);
  const a = forecast.assumptions;
  const rows: {
    icon: IconName;
    tone: string;
    name: string;
    sub: string;
    amount: string;
    sign?: "+" | "−";
  }[] = [
    {
      icon: "accounts",
      tone: "bg-primary-soft text-primary-text",
      name: t.rows.balance,
      sub: t.rows.balanceSub,
      amount: forecast.balance,
    },
    {
      icon: "transactions",
      tone: "bg-green-soft text-green-text",
      name: t.rows.income,
      sub: t.rows.incomeSub,
      amount: a.recurring_income,
      sign: "+",
    },
    {
      icon: "reports",
      tone: "bg-coral-soft text-coral-text",
      name: t.rows.expenses,
      sub: t.rows.expensesSub,
      amount: a.recurring_expenses,
      sign: "−",
    },
    {
      icon: "goals",
      tone: "bg-amber-soft text-amber-text",
      name: t.rows.goals,
      sub: t.rows.goalsSub,
      amount: a.goal_contributions,
      sign: "−",
    },
    {
      icon: "categories",
      tone: "bg-coral-soft text-coral-text",
      name: t.rows.variable,
      sub: t.rows.variableSub(a.history_months),
      amount: a.variable_spending,
      sign: "−",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {currencies.length > 1 && (
          <nav aria-label={t.currency} className="flex flex-wrap gap-2">
            {currencies.map((c) => (
              <Link
                key={c}
                href={href({ currency: c })}
                aria-current={c === currency ? "page" : undefined}
                className={pill(c === currency)}
              >
                {c}
              </Link>
            ))}
          </nav>
        )}
        <nav aria-label={t.horizons} className="glass inline-flex gap-1 rounded-full p-1">
          {HORIZONS.map((h) => (
            <Link
              key={h}
              href={href({ days: String(h) })}
              aria-current={h === days ? "page" : undefined}
              className={cx(
                "focus-ring inline-flex h-9 items-center rounded-full px-4 text-sm font-bold",
                h === days
                  ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                  : "text-ink-2",
              )}
            >
              {t.days(h)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassCard data-testid="forecast-projection">
          <p className="text-muted text-[13px] font-semibold">
            {t.onDate(shortDate(point.on, i18n.locale))}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p
              data-testid="forecast-value"
              className={cx(
                "text-[38px] font-extrabold tracking-[-0.03em] tabular-nums max-md:text-3xl",
                new Decimal(point.balance).isNegative() && "text-coral-text",
              )}
            >
              {money(point.balance)}
            </p>
            <p className={cx("text-sm font-extrabold", up ? "text-green-text" : "text-coral-text")}>
              {t.vsToday(money(new Decimal(change).abs().toString(), up ? "+" : "−"))}
            </p>
          </div>
          <LineChart
            className="mt-4"
            series={[{ values: chartValues(forecast), tone: up ? "green" : "coral" }]}
            labels={[t.today, ...forecast.points.map((p) => t.days(p.days))]}
            highlight={forecast.points.indexOf(point) + 1}
            label={t.chart(money(forecast.balance), at(30), at(60), at(90))}
          />
          <dl className="border-line mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
            <div>
              <dt className="text-muted text-xs font-semibold">{t.today}</dt>
              <dd className="font-extrabold tabular-nums">{money(forecast.balance)}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold">{t.days(days)}</dt>
              <dd className="font-extrabold tabular-nums">{money(point.balance)}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold">{t.lowest}</dt>
              <dd className="font-extrabold tabular-nums">{money(lowestBalance(forecast))}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard data-testid="forecast-assumptions">
          <div className="text-muted flex items-center justify-between text-[11px] font-extrabold tracking-wide uppercase">
            <h2>{t.assumptions}</h2>
            <span>{t.every30}</span>
          </div>
          <ul className="mt-2">
            {rows.map((r) => (
              <li
                key={r.name}
                className="border-line flex items-center gap-3 border-b py-3 last:border-0"
              >
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", r.tone)}>
                  <Icon name={r.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px] font-extrabold">{r.name}</b>
                  <span className="text-muted block text-[11px] font-semibold">{r.sub}</span>
                </span>
                <b
                  className={cx(
                    "text-sm font-extrabold tabular-nums",
                    r.sign === "+" && "text-green-text",
                    r.sign === "−" && "text-coral-text",
                  )}
                >
                  {money(r.amount, new Decimal(r.amount).isZero() ? undefined : r.sign)}
                </b>
              </li>
            ))}
          </ul>
          <ButtonLink href="/scenarios" variant="secondary" size="md" className="mt-3 w-full">
            {t.tryScenario}
          </ButtonLink>
        </GlassCard>
      </div>

      {forecast.goes_negative_on && (
        <p
          data-testid="forecast-negative"
          className="bg-coral-soft text-coral-text flex items-center gap-2.5 rounded-[20px] px-4 py-3 text-sm font-bold"
        >
          <Icon name="alert" className="size-[18px]" />
          {t.goesNegative(shortDate(forecast.goes_negative_on, i18n.locale))}
        </p>
      )}
      {/* RF-6: la estimación mejora con más historial. */}
      {forecast.limited_history && (
        <p
          data-testid="forecast-limited"
          className="bg-well text-ink-2 rounded-[20px] px-4 py-3 text-sm font-semibold"
        >
          {t.limitedHistory}
        </p>
      )}
      <p className="text-muted text-center text-xs font-semibold">{t.footnote}</p>
    </>
  );
}

async function load(requested: string | undefined) {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const [accounts, currencyList, preferences] = await Promise.all([
      transactionsGateway().accounts(token),
      map.currencies(token),
      map.preferences(token).catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencyList);
    // Las monedas con cuentas activas, la principal primero.
    const currencies = catalog.order([
      ...new Set(accounts.filter((a) => !a.archived_at).map((a) => a.currency)),
    ]);
    const currency = currencies.find((c) => c === requested) ?? currencies[0] ?? null;
    const forecast = currency ? await map.forecast(token, currency) : null;
    return { catalog, currencies, currency, forecast, hidden: hiddenAmounts };
  });
}
