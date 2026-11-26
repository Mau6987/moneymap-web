import { randomUUID } from "node:crypto";

import Decimal from "decimal.js";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Button, ButtonLink } from "@/components/button";
import { LineChart } from "@/components/line-chart";
import { GlassCard, Pill, ProgressTrack } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { GoalMoney } from "@/features/goals/components/goal-forms";
import { isLate, nearestPriority } from "@/features/goals/domain/goal";
import {
  contribute,
  deleteGoal,
  withdraw,
  withdrawAndDelete,
} from "@/features/goals/goals-actions";
import { loadGoals, type AccountChoice } from "@/features/goals/goals-data";
import type { Account } from "@/features/transactions/data/transactions-gateway";
import type { Goal } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { cx } from "@/lib/cx";
import { longDate, monthName } from "@/lib/dates";
import { goalErrorText } from "@/lib/i18n/goals-messages";
import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locale";
/**
 * Metas (spec 005, RF-2 a RF-9; mockup "Web-Metas"): la lista por moneda,
 * nunca sumadas, y el detalle de la elegida con su Goal Forecast.
 */
export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string; confirm?: string; saved?: string; error?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.goals;
  const params = await searchParams;
  let data: Awaited<ReturnType<typeof loadGoals>> | null = null;
  try {
    data = await loadGoals();
  } catch (error) {
    unstable_rethrow(error);
  }
  const today = isoToday();
  const selected = data?.goals.find((g) => g.id === params.goal) ?? data?.goals[0];
  const toast = params.saved ? t.toasts[params.saved] : undefined;

  return (
    <>
      {toast && <Toast>{toast}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {data && (
            <p className="text-muted text-[13px] font-semibold">{t.count(data.goals.length)}</p>
          )}
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title}
          </h1>
        </div>
        <ButtonLink href="/goals/new" size="md">
          <Icon name="plus" />
          {t.new}
        </ButtonLink>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/goals" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : data.goals.length === 0 ? (
        <GlassCard>
          <p className="text-muted text-sm">{t.empty}</p>
          <ButtonLink href="/goals/new" size="md" className="mt-4">
            {t.new}
          </ButtonLink>
        </GlassCard>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.1fr]">
          <GoalList
            goals={data.goals}
            selected={selected?.id}
            catalog={data.catalog}
            hidden={data.hidden}
            today={today}
          />
          {selected && (
            <GoalDetail
              goal={selected}
              catalog={data.catalog}
              hidden={data.hidden}
              today={today}
              confirmDelete={params.confirm === "delete"}
              error={params.error}
              accounts={data.accounts}
            />
          )}
        </div>
      )}
    </>
  );
}

function GoalList({
  goals,
  selected,
  catalog,
  hidden,
  today,
}: {
  goals: Goal[];
  selected?: string;
  catalog: CurrencyCatalog;
  hidden: boolean;
  today: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.goals;
  const codes = catalog.order(new Set(goals.map((g) => g.currency)));
  return (
    <GlassCard aria-labelledby="goals-yours">
      <h2 id="goals-yours" className="text-[15px] font-extrabold">
        {t.yours}
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
            {goals
              .filter((g) => g.currency === code)
              .map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/goals?goal=${g.id}`}
                    aria-current={g.id === selected ? "true" : undefined}
                    data-testid={`goal-${g.id}`}
                    className={cx(
                      "focus-ring block rounded-[18px] p-3.5",
                      g.id === selected ? "bg-primary-soft" : "bg-well",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b className="truncate">{g.name}</b>
                      <span className="text-sm font-extrabold">{g.progress_percent}%</span>
                    </div>
                    <p className="mt-1 text-sm">
                      <b className="tabular-nums">
                        {formatMoney(g.current_amount, code, catalog, { hidden })}
                      </b>
                      <span className="text-muted">
                        {" "}
                        / {formatMoney(g.target_amount, code, catalog, { hidden })}
                      </span>
                    </p>
                    <div className="mt-2 flex">
                      <ProgressTrack
                        percent={g.progress_percent}
                        tone={
                          g.status === "achieved" ? "green" : isLate(g, today) ? "coral" : "primary"
                        }
                        label={t.progress(g.name, g.progress_percent)}
                      />
                    </div>
                    <p className="text-muted mt-1.5 text-xs font-semibold">
                      {[
                        g.status === "achieved" ? t.achieved : isLate(g, today) ? t.late : null,
                        g.estimated_completion
                          ? `${t.reachedIn} ${month(g.estimated_completion, i18n.locale)}`
                          : null,
                        t.priorities[nearestPriority(g.priority)],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </GlassCard>
  );
}

const month = (iso: string, locale: Locale) => `${monthName(iso, locale)} ${iso.slice(0, 4)}`;

function GoalDetail({
  goal,
  catalog,
  hidden,
  today,
  confirmDelete,
  error,
  accounts,
}: {
  goal: Goal;
  catalog: CurrencyCatalog;
  hidden: boolean;
  today: string;
  confirmDelete: boolean;
  error?: string;
  accounts: Account[];
}) {
  const i18n = useServerMessages();
  const t = i18n.goals;
  const money = (amount: string) => formatMoney(amount, goal.currency, catalog, { hidden });
  const late = isLate(goal, today);
  // Solo las de la moneda de la meta: nunca se convierte (constitución §2).
  const choices: AccountChoice[] = accounts
    .filter((a) => a.currency === goal.currency)
    .map((a) => ({
      id: a.id,
      name: a.last4 ? `${a.name} •• ${a.last4}` : a.name,
      detail: money(a.current_balance),
      balance: a.current_balance,
      isDefault: a.is_default,
    }));
  return (
    <div className="flex flex-col gap-4">
      <GlassCard aria-labelledby="goal-title" data-testid="goal-detail">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="goal-title" className="text-lg font-extrabold">
            {goal.name}
          </h2>
          <div className="flex items-center gap-2">
            {goal.status === "achieved" && <Pill tone="green">{t.achieved}</Pill>}
            {late && <Pill tone="coral">{t.late}</Pill>}
            <Pill tone="primary">{t.priorities[nearestPriority(goal.priority)]}</Pill>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm max-sm:grid-cols-1">
          <div>
            <dt className="text-muted text-xs font-semibold">{t.saved}</dt>
            <dd className="text-xl font-extrabold tabular-nums">{money(goal.current_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold">{t.target}</dt>
            <dd className="text-xl font-extrabold tabular-nums">{money(goal.target_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold">{t.reachedIn}</dt>
            <dd className="text-xl font-extrabold">
              {goal.estimated_completion ? month(goal.estimated_completion, i18n.locale) : "—"}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <ProgressTrack
            percent={goal.progress_percent}
            tone={goal.status === "achieved" ? "green" : late ? "coral" : "primary"}
            label={t.progress(goal.name, goal.progress_percent)}
          />
          <span className="text-sm font-extrabold">{goal.progress_percent}%</span>
        </div>
        {/* Mockup "Web-Metas": de cero a lo ahorrado y, al ritmo de hoy, hasta la meta. */}
        {goal.status !== "achieved" && goal.estimated_completion && (
          <LineChart
            className="mt-4"
            series={[
              { values: ["0", goal.current_amount], tone: "primary" },
              {
                values: [goal.current_amount, goal.target_amount],
                tone: "primary",
                dashed: true,
                start: 1,
              },
            ]}
            guide={goal.target_amount}
            highlight={1}
            labels={[t.chartStart, t.chartToday, month(goal.estimated_completion, i18n.locale)]}
            label={t.chart(
              money(goal.current_amount),
              money(goal.target_amount),
              month(goal.estimated_completion, i18n.locale),
            )}
          />
        )}
        <p className="text-muted mt-3 text-sm">
          {goal.status === "achieved"
            ? t.achieved
            : goal.estimated_completion
              ? t.pace(goal.name, month(goal.estimated_completion, i18n.locale))
              : t.noEstimate}
        </p>
        {goal.suggested_contribution && (
          <p className="mt-1 text-sm font-bold" data-testid="goal-suggested">
            {t.suggested(money(goal.suggested_contribution), goal.period_type)}
          </p>
        )}
        <p className="text-muted mt-1 text-xs font-semibold">
          {t.targetDate}: {goal.target_date ? longDate(goal.target_date, i18n.locale) : t.noDate}
        </p>
        <div className="mt-4">
          <GoalMoney
            key={goal.id}
            contribute={contribute}
            withdraw={withdraw}
            goalId={goal.id}
            goalName={goal.name}
            currency={goal.currency}
            label={catalog.labelOf(goal.currency)}
            decimals={catalog.decimalsOf(goal.currency)}
            saved={goal.current_amount}
            savedText={money(goal.current_amount)}
            target={goal.target_amount}
            today={today}
            keys={{ contribute: randomUUID(), withdraw: randomUUID() }}
            accounts={choices}
            // BUG-049: una meta cumplida o archivada no recibe más aportes.
            canContribute={goal.status !== "achieved" && goal.status !== "archived"}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href={`/goals/${goal.id}/edit`} variant="secondary" size="md">
            {t.edit}
          </ButtonLink>
          <ButtonLink href={`/goals?goal=${goal.id}&confirm=delete`} variant="ghost" size="md">
            {t.delete}
          </ButtonLink>
        </div>
        {error && (
          <p
            role="alert"
            className="bg-coral-soft text-coral-text mt-3 rounded-2xl px-4 py-3 text-sm font-bold"
          >
            {goalErrorText(error, i18n.locale)}
          </p>
        )}
        {confirmDelete && new Decimal(goal.current_amount).gt(0) ? (
          // Con ahorro, como la app: elegir a qué cuenta vuelve y borrarla.
          <form
            action={withdrawAndDelete}
            role="alertdialog"
            aria-labelledby="goal-delete-title"
            className="bg-coral-soft mt-4 flex flex-col gap-3 rounded-[18px] p-4"
          >
            <input type="hidden" name="id" value={goal.id} />
            <input type="hidden" name="saved" value={goal.current_amount} />
            <input type="hidden" name="key" value={randomUUID()} />
            <h3 id="goal-delete-title" className="font-extrabold">
              {t.deleteSavedTitle(money(goal.current_amount))}
            </h3>
            {choices.length === 0 ? (
              <p className="text-sm">{t.deleteNoAccount(goal.currency)}</p>
            ) : (
              <fieldset>
                <legend className="mb-2 text-sm">{t.deleteSavedBody}</legend>
                <div className="flex flex-wrap gap-2">
                  {choices.map((a, i) => (
                    <label
                      key={a.id}
                      className="bg-well focus-within:outline-primary-text flex cursor-pointer flex-col rounded-[16px] px-4 py-1.5 text-sm leading-tight font-bold focus-within:outline-2 has-[:checked]:bg-[rgb(21_25_54/0.9)] has-[:checked]:text-white dark:has-[:checked]:bg-white/90 dark:has-[:checked]:text-[#151936]"
                    >
                      <input
                        type="radio"
                        name="account"
                        value={a.id}
                        defaultChecked={i === 0}
                        className="sr-only"
                      />
                      <span>{a.name}</span>
                      <span className="text-xs font-bold opacity-75">{a.detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <Link
                href={`/goals?goal=${goal.id}`}
                className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
              >
                {t.cancel}
              </Link>
              <Button type="submit" variant="danger" size="md" disabled={choices.length === 0}>
                {t.withdrawAndDelete}
              </Button>
            </div>
          </form>
        ) : (
          confirmDelete && (
            <form
              action={deleteGoal}
              role="alertdialog"
              aria-labelledby="goal-delete-title"
              className="bg-coral-soft mt-4 rounded-[18px] p-4"
            >
              <input type="hidden" name="id" value={goal.id} />
              <h3 id="goal-delete-title" className="font-extrabold">
                {t.deleteTitle(goal.name)}
              </h3>
              <p className="mt-1 text-sm">{t.deleteBody}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Link
                  href={`/goals?goal=${goal.id}`}
                  className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
                >
                  {t.cancel}
                </Link>
                <Button type="submit" variant="danger" size="md">
                  {t.deleteConfirm}
                </Button>
              </div>
            </form>
          )
        )}
      </GlassCard>
    </div>
  );
}
