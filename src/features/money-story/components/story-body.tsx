import Decimal from "decimal.js";
import Link from "next/link";

import { BarGroups } from "@/components/bar-groups";
import { GlassCard } from "@/components/glass-card";
import { FlowDonut } from "@/features/money-flow/components/flow-donut";
import { cx } from "@/lib/cx";
import { monthName } from "@/lib/dates";

import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { MoneyStory } from "../data/money-story-gateway";
import { changeOf, highlightText, savingsPercent } from "../domain/story";

import { useServerMessages } from "@/lib/i18n/server";
/**
 * La historia de una moneda: lo que entró, salió y se ahorró con la tasa en
 * un anillo (RF-1), lo que pasó en frases (RF-4) y el mes anterior (RF-2).
 * Los montos se tapan en modo privado.
 */
export function StoryBody({
  story,
  catalog,
  hidden,
}: {
  story: MoneyStory;
  catalog: CurrencyCatalog;
  hidden: boolean;
}) {
  const i18n = useServerMessages();
  const t = i18n.moneyStory;
  const money = (amount: string) => formatMoney(amount, story.currency, catalog, { hidden });
  const percent = savingsPercent(story.savings_rate);
  const rate = hidden || percent === null ? "—" : `${percent} %`;
  const deficit = new Decimal(story.savings_total).lt(0);
  const before = story.comparison;
  const lines = story.highlights
    .map((h) => highlightText(h, money, t, i18n.locale))
    .filter((line): line is string => line !== null);
  const change = (now: string, then: string) => {
    const { arrow, amount } = changeOf(now, then);
    return arrow ? `${arrow} ${money(amount)}` : t.same;
  };
  const rows: (readonly [string, string])[] = before
    ? [
        [t.income, change(story.income_total, before.income_total)],
        [t.expense, change(story.expense_total, before.expense_total)],
        [t.savingsRow, change(story.savings_total, before.savings_total)],
        ...(before.top_expense_category
          ? [
              [
                t.topBefore(before.top_expense_category.name),
                money(before.top_expense_category.total),
              ] as const,
            ]
          : []),
        [t.goalsBefore, money(before.goals_contributed)],
      ]
    : [];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_1fr]">
      <div className="flex min-w-0 flex-col gap-4">
        <GlassCard data-testid="story-totals">
          <div className="flex flex-wrap items-center gap-6">
            <FlowDonut
              label={t.rateLabel(rate)}
              segments={[
                {
                  key: "rate",
                  color: "var(--mm-primary)",
                  share: hidden || percent === null ? 0 : Math.min(100, Math.max(0, percent)) / 100,
                },
              ]}
            >
              <div className="text-2xl font-extrabold tabular-nums">{rate}</div>
              <div className="text-muted text-xs font-semibold">{t.rate}</div>
            </FlowDonut>
            <dl className="flex min-w-[12rem] flex-1 flex-col gap-3">
              {(
                [
                  [t.income, story.income_total, "text-green-text"],
                  [t.expense, story.expense_total, "text-coral-text"],
                  [deficit ? t.deficit : t.savings, story.savings_total, "text-primary-text"],
                ] as const
              ).map(([label, amount, color]) => (
                <div key={label}>
                  <dt className="text-muted text-xs font-semibold">{label}</dt>
                  <dd className={cx("text-xl font-extrabold tabular-nums", color)}>
                    {money(amount)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {story.is_first_month && (
            <p data-testid="story-first-month" className="text-muted mt-4 text-center text-sm">
              {t.firstMonth}
            </p>
          )}
        </GlassCard>
        {lines.length > 0 && (
          <GlassCard aria-labelledby="story-highlights">
            <h2 id="story-highlights" className="text-[15px] font-extrabold">
              {t.highlights}
            </h2>
            <ul data-testid="story-highlights" className="mt-3 flex flex-col gap-2.5 text-sm">
              {lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true" className="text-primary-text">
                    ✦
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {before && (
          <GlassCard data-testid="story-comparison" aria-labelledby="story-versus">
            <h2
              id="story-versus"
              className="text-muted text-xs font-extrabold tracking-[0.05em] uppercase"
            >
              {t.versus(monthName(`${before.period}-01`, i18n.locale).toLowerCase())}
            </h2>
            <BarGroups
              legend={[
                monthName(`${before.period}-01`, i18n.locale),
                monthName(story.period_starts_on, i18n.locale),
              ]}
              label={t.barsLabel(
                monthName(`${before.period}-01`, i18n.locale).toLowerCase(),
                monthName(story.period_starts_on, i18n.locale).toLowerCase(),
              )}
              groups={[
                {
                  label: t.income,
                  values: [before.income_total, story.income_total],
                  tone: "green",
                },
                {
                  label: t.expense,
                  values: [before.expense_total, story.expense_total],
                  tone: "coral",
                },
                {
                  label: t.savingsRow,
                  values: [before.savings_total, story.savings_total],
                  tone: "primary",
                },
              ]}
            />
            <dl className="mt-1 flex flex-col text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 pt-3">
                  <dt className="font-semibold">{label}</dt>
                  <dd className="font-extrabold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        )}
        <Link
          href={`/money-flow?currency=${story.currency}&period=${story.period_starts_on.slice(0, 7)}`}
          className="focus-ring text-primary-text text-sm font-bold"
        >
          {t.flowLink}
        </Link>
      </div>
    </div>
  );
}
