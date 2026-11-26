import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Button, ButtonLink } from "@/components/button";
import { GlassCard, Pill, ProgressTrack } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { deleteBudget } from "@/features/budgets/budgets-actions";
import { isAtRisk, loadBudgets, recentExpenses } from "@/features/budgets/budgets-data";
import { BarGroups } from "@/components/bar-groups";
import { PaceChart } from "@/features/budgets/components/pace-chart";
import { weeklySpend } from "@/features/budgets/domain/weeks";
import type { Budget, Transaction } from "@/features/map/data/map-gateway";
import { isoToday, periodDay, periodElapsed } from "@/features/map/domain/map";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";
import { budgetErrorText } from "@/lib/i18n/budgets-messages";
import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/catalog";
type Tone = "green" | "amber" | "coral";

function toneOf(b: Budget): Tone {
  if (b.remaining.startsWith("-") || b.pace.status === "too_fast") return "coral";
  if (b.pace.status === "a_bit_fast") return "amber";
  return "green";
}

function paceLabel(b: Budget, t: Messages["budgets"]): string | undefined {
  if (b.remaining.startsWith("-")) return t.overspent;
  return b.pace.status ? t.pace[b.pace.status] : undefined;
}

/**
 * Presupuestos (spec 009 del back, RF-1 a RF-11; mockup "Web-Presupuestos"):
 * cada presupuesto con su ritmo y, al costado, el elegido con el gasto del mes
 * día por día. Nunca un total que sume monedas.
 */
export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ budget?: string; confirm?: string; saved?: string; error?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.budgets;
  const params = await searchParams;
  let data: Awaited<ReturnType<typeof loadBudgets>> | null = null;
  try {
    data = await loadBudgets();
  } catch (error) {
    unstable_rethrow(error);
  }
  const today = isoToday();
  const selected = data?.budgets.find((b) => b.id === params.budget) ?? data?.budgets[0];
  let recent: Transaction[] | null = null;
  if (selected) {
    try {
      recent = await recentExpenses(selected);
    } catch (error) {
      unstable_rethrow(error);
    }
  }
  const toast = params.saved ? t.toasts[params.saved] : undefined;
  const first = data?.budgets[0];

  return (
    <>
      {toast && <Toast>{toast}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {data && (
            <p className="text-muted text-[13px] font-semibold">{t.count(data.budgets.length)}</p>
          )}
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title}
          </h1>
        </div>
        <ButtonLink href="/budgets/new" size="md">
          <Icon name="plus" />
          {t.new}
        </ButtonLink>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/budgets" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : !first ? (
        <GlassCard>
          <p className="text-muted text-sm">{t.empty}</p>
          <ButtonLink href="/budgets/new" size="md" className="mt-4">
            {t.new}
          </ButtonLink>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <GlassCard>
              <p className="text-muted text-xs font-semibold">{t.thisMonth}</p>
              <p className="mt-1 font-extrabold">
                {(() => {
                  const [day, days] = periodDay(
                    first.period_starts_on,
                    first.period_ends_on,
                    today,
                  );
                  const percent = Math.round(
                    periodElapsed(first.period_starts_on, first.period_ends_on, today) * 100,
                  );
                  return t.monthDay(day, days, percent);
                })()}
              </p>
            </GlassCard>
            <GlassCard>
              <p className="text-muted text-xs font-semibold">{t.atRisk}</p>
              <p className="mt-1 text-xl font-extrabold" data-testid="budgets-at-risk">
                {data.budgets.filter(isAtRisk).length}
              </p>
              <p className="text-muted text-xs">{t.atRiskNote}</p>
            </GlassCard>
          </div>
          <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.1fr]">
            <BudgetList
              budgets={data.budgets}
              selected={selected?.id}
              catalog={data.catalog}
              hidden={data.hidden}
              today={today}
            />
            {selected && (
              <BudgetDetail
                budget={selected}
                catalog={data.catalog}
                hidden={data.hidden}
                today={today}
                recent={recent}
                confirmDelete={params.confirm === "delete"}
                error={params.error}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

function BudgetList({
  budgets,
  selected,
  catalog,
  hidden,
  today,
}: {
  budgets: Budget[];
  selected?: string;
  catalog: CurrencyCatalog;
  hidden: boolean;
  today: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.budgets;
  const codes = catalog.order(new Set(budgets.map((b) => b.currency)));
  return (
    <GlassCard aria-labelledby="budgets-list">
      <h2 id="budgets-list" className="text-[15px] font-extrabold">
        {t.thisMonth}
      </h2>
      {codes.map((code) => (
        <section
          key={code}
          className="mt-4"
          aria-label={`${code} · ${catalog.get(code)?.name ?? code}`}
        >
          {codes.length > 1 && (
            <h3 className="text-muted mb-2 text-xs font-bold">
              {code} · {catalog.get(code)?.name ?? code}
            </h3>
          )}
          <ul className="flex flex-col gap-2">
            {budgets
              .filter((b) => b.currency === code)
              .map((b) => {
                const money = (amount: string) => formatMoney(amount, code, catalog, { hidden });
                const elapsed = periodElapsed(b.period_starts_on, b.period_ends_on, today);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/budgets?budget=${b.id}`}
                      aria-current={b.id === selected ? "true" : undefined}
                      data-testid={`budget-${b.id}`}
                      className={cx(
                        "focus-ring block rounded-[18px] p-3.5",
                        b.id === selected ? "bg-primary-soft" : "bg-well",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <b className="truncate">{b.category_name}</b>
                        <span className="text-sm font-extrabold">{b.percent_used}%</span>
                      </div>
                      <div className="relative mt-2 flex">
                        <ProgressTrack
                          percent={b.percent_used}
                          tone={toneOf(b)}
                          label={t.used(b.category_name, b.percent_used)}
                        />
                        <span
                          aria-hidden="true"
                          className="bg-ink absolute -top-1 h-[18px] w-[3px] rounded"
                          style={{ left: `calc(${(elapsed * 100).toFixed(1)}% - 1.5px)` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted font-semibold">
                          {t.of(money(b.spent), money(b.amount))}
                        </span>
                        {paceLabel(b, t) && <Pill tone={toneOf(b)}>{paceLabel(b, t)}</Pill>}
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </GlassCard>
  );
}

function BudgetDetail({
  budget,
  catalog,
  hidden,
  today,
  recent,
  confirmDelete,
  error,
}: {
  budget: Budget;
  catalog: CurrencyCatalog;
  hidden: boolean;
  today: string;
  recent: Transaction[] | null;
  confirmDelete: boolean;
  error?: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.budgets;
  const money = (amount: string, sign?: "−") =>
    formatMoney(amount, budget.currency, catalog, { hidden, sign });
  const over = budget.remaining.startsWith("-");
  return (
    <GlassCard aria-labelledby="budget-title" data-testid="budget-detail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="budget-title" className="text-lg font-extrabold">
            {budget.category_name}
          </h2>
          <p className="text-muted text-xs font-semibold">
            {budget.currency} · {t.monthly}
          </p>
        </div>
        <ButtonLink href={`/budgets/${budget.id}/edit`} variant="secondary" size="md">
          {t.edit}
        </ButtonLink>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm max-sm:grid-cols-1">
        <div>
          <dt className="text-muted text-xs font-semibold">{t.spent}</dt>
          <dd className="text-xl font-extrabold tabular-nums">{money(budget.spent)}</dd>
        </div>
        <div>
          <dt className="text-muted text-xs font-semibold">{t.limit}</dt>
          <dd className="text-xl font-extrabold tabular-nums">{money(budget.amount)}</dd>
        </div>
        <div>
          <dt className="text-muted text-xs font-semibold">{over ? t.over : t.left}</dt>
          <dd
            className={cx(
              "text-xl font-extrabold tabular-nums",
              over ? "text-coral-text" : "text-green-text",
            )}
          >
            {money(budget.remaining.replace("-", ""))}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {paceLabel(budget, t) && <Pill tone={toneOf(budget)}>{paceLabel(budget, t)}</Pill>}
        <span className="text-muted text-sm">
          {budget.pace.status
            ? t.projection(money(budget.pace.projected_total))
            : !over
              ? t.tooEarly
              : ""}
        </span>
      </div>
      <div className="mt-4">
        <PaceChart budget={budget} today={today} label={t.chart} />
        <div className="text-muted mt-1 flex gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span
              className={cx(
                "h-[3px] w-3.5 rounded",
                toneOf(budget) === "coral" ? "bg-coral" : "bg-primary",
              )}
            />
            {t.chartSpent}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-green h-[3px] w-3.5 rounded" />
            {t.chartIdeal}
          </span>
        </div>
      </div>
      <h3 className="mt-5 text-[15px] font-extrabold">{t.weekly}</h3>
      <BarGroups
        label={t.weeklyLabel(budget.category_name)}
        groups={weeklySpend(budget).map((spent, i) => ({
          label: t.week(i + 1),
          values: [spent],
          tone: toneOf(budget) === "coral" ? "coral" : "primary",
        }))}
      />
      <h3 className="mt-5 text-[15px] font-extrabold">{t.recent}</h3>
      {!recent || recent.length === 0 ? (
        <p className="text-muted mt-2 text-sm">{t.noRecent}</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {recent.map((tx) => (
            <li
              key={tx.id}
              className="border-line flex justify-between gap-3 border-t py-2 text-sm first:border-t-0"
            >
              <span className="min-w-0 truncate font-semibold">
                {tx.description || budget.category_name}
                <span className="text-muted ml-2 text-xs">
                  {shortDate(tx.occurred_on, i18n.locale)}
                </span>
              </span>
              <b className="text-coral-text tabular-nums">{money(tx.amount, "−")}</b>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted mt-4 text-xs font-semibold">
        {t.alerts}:{" "}
        {[budget.alert_at_80 ? "80 %" : null, budget.alert_at_100 ? "100 %" : null]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
      <div className="mt-4">
        <ButtonLink href={`/budgets?budget=${budget.id}&confirm=delete`} variant="ghost" size="md">
          {t.delete}
        </ButtonLink>
      </div>
      {error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text mt-3 rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {budgetErrorText(error, i18n.locale)}
        </p>
      )}
      {confirmDelete && (
        <form
          action={deleteBudget}
          role="alertdialog"
          aria-labelledby="budget-delete-title"
          className="bg-coral-soft mt-4 rounded-[18px] p-4"
        >
          <input type="hidden" name="id" value={budget.id} />
          <h3 id="budget-delete-title" className="font-extrabold">
            {t.deleteTitle(budget.category_name)}
          </h3>
          <p className="mt-1 text-sm">{t.deleteBody}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Link
              href={`/budgets?budget=${budget.id}`}
              className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
            >
              {t.cancel}
            </Link>
            <Button type="submit" variant="danger" size="md">
              {t.deleteConfirm}
            </Button>
          </div>
        </form>
      )}
    </GlassCard>
  );
}
