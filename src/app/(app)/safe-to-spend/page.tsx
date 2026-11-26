import { Toast } from "@/components/toast";
import { SavingsForm } from "@/features/settings/components/money-forms";
import { saveSavings } from "@/features/settings/settings-actions";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { WaterfallChart } from "@/components/waterfall-chart";
import { MapError, NoAccounts } from "@/features/map/components/map-states";
import { isNegative } from "@/features/map/domain/map";
import { loadMap, type MapData } from "@/features/map/map-data";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";

import { formatMoney, formatNumber } from "@/lib/money/money";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
/**
 * Safe to Spend (spec 003, RF-1 a RF-9; mockup "Web-SafeToSpend"): el saldo
 * de la moneda menos lo comprometido en el periodo. Cada monto es el de la API;
 * la web no resta nada.
 */
export default async function SafeToSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; saved?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.map;
  const { currency, saved } = await searchParams;
  let data: MapData | null = null;
  try {
    data = await loadMap(currency);
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      {saved === "savings" && <Toast>{i18n.settings.money.saved}</Toast>}
      <header>
        <Link
          href={`/map${currency ? `?currency=${currency}` : ""}`}
          className="focus-ring text-primary-text inline-flex items-center gap-1 text-sm font-bold"
        >
          <Icon name="back" className="size-4" />
          {t.back}
        </Link>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {t.safeToSpend}
        </h1>
      </header>
      <Breakdown
        data={data}
        retryHref={`/safe-to-spend${currency ? `?currency=${currency}` : ""}`}
      />
    </>
  );
}

function Breakdown({ data, retryHref }: { data: MapData | null; retryHref: string }) {
  const i18n = useServerMessages();
  const t = i18n.map;
  if (!data) return <MapError retryHref={retryHref} />;
  const block = data.single ?? data.all?.[0];
  if (!block) return <NoAccounts />;

  const sts = block.safeToSpend;
  const negative = isNegative(sts);
  const amount = (value: string, sign?: "+" | "−") =>
    formatMoney(value, sts.currency, data.catalog, { hidden: data.hidden, sign });
  const rows: [string, string, "+" | "−" | undefined][] = [
    [t.breakdownBalance, sts.breakdown.current_balance, undefined],
    [t.breakdownRecurring, sts.breakdown.pending_recurring, "−"],
    [t.breakdownSavings, sts.breakdown.planned_savings, "−"],
    [t.breakdownGoals, sts.breakdown.goal_contributions, "−"],
  ];

  return (
    <GlassCard aria-labelledby="sts-title" data-testid="sts-breakdown">
      <p className="text-muted text-xs font-semibold">
        {sts.currency} ·{" "}
        {t.breakdownPeriod(
          shortDate(sts.period_starts_on, i18n.locale),
          shortDate(sts.period_ends_on, i18n.locale),
        )}
      </p>
      <p
        className={cx("mt-1 text-4xl font-extrabold tabular-nums", negative && "text-coral-text")}
        data-testid="sts-amount"
      >
        {amount(sts.amount)}
      </p>
      {negative && <p className="text-coral-text mt-1 text-sm font-bold">{t.negative}</p>}
      <WaterfallChart
        label={t.waterfall.label(
          amount(sts.breakdown.current_balance),
          amount(sts.breakdown.pending_recurring),
          amount(sts.breakdown.planned_savings),
          amount(sts.breakdown.goal_contributions),
          amount(sts.amount),
        )}
        steps={[
          {
            label: t.waterfall.balance,
            amount: sts.breakdown.current_balance,
            text: amount(sts.breakdown.current_balance),
            kind: "start",
            tone: "ink",
          },
          {
            label: t.waterfall.recurring,
            amount: sts.breakdown.pending_recurring,
            text: amount(sts.breakdown.pending_recurring, "−"),
            kind: "minus",
            tone: "coral",
          },
          {
            label: t.waterfall.savings,
            amount: sts.breakdown.planned_savings,
            text: amount(sts.breakdown.planned_savings, "−"),
            kind: "minus",
            tone: "primary",
          },
          {
            label: t.waterfall.goals,
            amount: sts.breakdown.goal_contributions,
            text: amount(sts.breakdown.goal_contributions, "−"),
            kind: "minus",
            tone: "amber",
          },
          {
            label: t.waterfall.free,
            amount: sts.amount,
            text: amount(sts.amount),
            kind: "result",
            tone: negative ? "coral" : "green",
          },
        ]}
      />
      <h2 id="sts-title" className="mt-5 text-[15px] font-extrabold">
        {t.breakdownTitle}
      </h2>
      <dl className="mt-2 flex flex-col">
        {rows.map(([label, value, sign]) => (
          <div
            key={label}
            className="border-line flex justify-between gap-3 border-b py-2.5 text-sm"
          >
            <dt className="font-semibold">{label}</dt>
            <dd className="font-extrabold tabular-nums">{amount(value, sign)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-2.5 text-sm">
          <dt className="font-extrabold">{t.breakdownResult}</dt>
          <dd className={cx("font-extrabold tabular-nums", negative && "text-coral-text")}>
            {amount(sts.amount)}
          </dd>
        </div>
      </dl>
      <p className="text-muted mt-3 text-xs">{t.breakdownNote}</p>
      {/* Como la app: el ahorro planificado se edita acá (es de la moneda principal). */}
      {block.balance.is_main_currency && (
        <div className="border-line mt-5 border-t pt-4" data-testid="sts-savings">
          <SavingsForm
            amount={formatNumber(
              sts.breakdown.planned_savings,
              data.catalog.decimalsOf(sts.currency),
            )}
            currency={sts.currency}
            decimals={data.catalog.decimalsOf(sts.currency)}
            action={saveSavings}
            back="/safe-to-spend"
          />
        </div>
      )}
    </GlassCard>
  );
}
