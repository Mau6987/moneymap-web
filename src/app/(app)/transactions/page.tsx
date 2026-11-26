import { amountsHidden } from "@/lib/privacy";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Toast } from "@/components/toast";
import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { GoalMovementsTable } from "@/features/transactions/components/goal-movements-table";
import { MovementPanel } from "@/features/transactions/components/movement-panel";
import { TransactionsFilters } from "@/features/transactions/components/transactions-filters";
import { TransactionsTable } from "@/features/transactions/components/transactions-table";
import { TwoColumnTransactionsTable } from "@/features/transactions/components/two-column-table";
import {
  transactionsGateway,
  type GoalMovement,
} from "@/features/transactions/data/transactions-gateway";
import type { Transaction } from "@/features/map/data/map-gateway";
import {
  byKind,
  filtersHref,
  parseFilters,
  periodKind,
  toGoalMovementsQuery,
  type FinancialPeriod,
  toQuery,
  type Filters,
} from "@/features/transactions/domain/filters";
import { withAccessToken } from "@/lib/auth/session";

import { CurrencyCatalog } from "@/lib/money/currency";

import { recurringErrorText } from "@/lib/i18n/recurring-messages";
import { getMessages } from "@/lib/i18n/server";
/**
 * Movimientos (spec 002, RF-6 y RF-32; mockups "Web-Movimientos" y "Web-Filtros"):
 * solo lo que ya pasó. Los gastos fijos vencidos se pagan desde el Map (BUG-055).
 */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const i18n = await getMessages();
  const quickAdd = i18n.quickAdd;
  const transferMessages = i18n.transfer;
  const t = i18n.transactions;
  const params = await searchParams;
  const filters = parseFilters(params);
  const saved =
    params.saved === "income"
      ? quickAdd.savedIncome
      : params.saved === "expense"
        ? quickAdd.savedExpense
        : params.saved === "transfer"
          ? transferMessages.saved
          : params.saved === "paid"
            ? i18n.payables.paid
            : params.saved === "skipped"
              ? i18n.payables.skipped
              : params.saved === "updated"
                ? t.edit.updated
                : params.saved === "deleted"
                  ? t.edit.deleted
                  : params.saved === "voice"
                    ? t.edit.voice
                    : params.saved === "receipt"
                      ? t.edit.receiptSaved
                      : params.saved === "receipt_removed"
                        ? t.edit.receiptRemoved
                        : null;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(filters);
  } catch (error) {
    unstable_rethrow(error);
  }

  // El gasto o ingreso abierto para corregirlo (como el detalle de la app).
  const editing =
    typeof params.movement === "string"
      ? data?.items.find((tx) => tx.id === params.movement && tx.kind !== "transfer")
      : undefined;

  return (
    <>
      {saved && <Toast>{saved}</Toast>}
      {typeof params.error === "string" && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {recurringErrorText(params.error, i18n.locale)}
        </p>
      )}
      {/* BUG-057: Movimientos solo informa; Transferir está en el menú y en el Map. */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {data && (
            <p className="text-muted text-[13px] font-semibold">
              {t.count(data.goals ? data.goals.length : data.items.length)}
            </p>
          )}
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={filtersHref(filters, { view: filters.view === "two-column" ? "" : "two-column" })}
            className="focus-ring glass inline-flex h-9 items-center rounded-full px-4 text-xs font-bold text-ink-2 hover:bg-well"
          >
            {filters.view === "two-column" ? "Ver tabla" : "Ver dos columnas"}
          </Link>
        </div>
      </header>
      {data ? (
        <>
          <TransactionsFilters
            filters={filters}
            accounts={data.activeAccounts}
            categories={data.categories}
            currencies={data.currencies}
            period={data.period}
          />
          {editing && (
            <MovementPanel
              key={editing.id}
              movement={editing}
              accounts={data.activeAccounts
                .filter((a) => a.currency === editing.currency)
                .map((a) => ({ id: a.id, name: a.last4 ? `${a.name} •• ${a.last4}` : a.name }))}
              categories={data.categories
                .filter((c) => c.type === editing.kind)
                .map((c) => ({ id: c.id, name: c.name }))}
              decimals={data.catalog.decimalsOf(editing.currency)}
              back={filtersHref(filters, { cursor: filters.cursor })}
            />
          )}
          <GlassCard className="!px-2 sm:!px-3">
            {data.goals ? (
              data.goals.length === 0 ? (
                <p className="text-muted p-3 text-sm" data-testid="transactions-empty">
                  {t.goalsEmpty}
                </p>
              ) : (
                <GoalMovementsTable
                  items={data.goals}
                  accounts={data.accounts}
                  catalog={data.catalog}
                  hidden={data.hidden}
                  today={isoToday()}
                />
              )
            ) : data.items.length === 0 ? (
              <p className="text-muted p-3 text-sm" data-testid="transactions-empty">
                {isFiltered(filters) ? t.empty : t.emptyAll}
              </p>
            ) : filters.view === "two-column" ? (
              <TwoColumnTransactionsTable
                items={data.items}
                goalMovements={data.allGoalMovements}
                accounts={data.accounts}
                categories={data.categories}
                catalog={data.catalog}
                hidden={data.hidden}
                today={isoToday()}
                editHref={(id) => {
                  const base = filtersHref(filters, { cursor: filters.cursor });
                  return `${base}${base.includes("?") ? "&" : "?"}movement=${id}`;
                }}
              />
            ) : (
              <TransactionsTable
                items={data.items}
                accounts={data.accounts}
                categories={data.categories}
                catalog={data.catalog}
                hidden={data.hidden}
                account={filters.account}
                today={isoToday()}
                editHref={(id) => {
                  const base = filtersHref(filters, { cursor: filters.cursor });
                  return `${base}${base.includes("?") ? "&" : "?"}movement=${id}`;
                }}
              />
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-3">
              {filters.cursor && (
                <Link
                  href={filtersHref(filters)}
                  className="focus-ring text-primary-text p-2 text-sm font-bold"
                >
                  {t.newest}
                </Link>
              )}
              {data.nextCursor && (
                <Link
                  href={filtersHref(filters, { cursor: data.nextCursor })}
                  className="focus-ring text-primary-text p-2 text-sm font-bold"
                  data-testid="transactions-more"
                >
                  {t.more}
                </Link>
              )}
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink
            href={filtersHref(filters, { cursor: filters.cursor })}
            size="md"
            className="mt-4"
          >
            {t.retry}
          </ButtonLink>
        </GlassCard>
      )}
    </>
  );
}

function isFiltered(f: Filters): boolean {
  return !!(f.q || f.kind !== "all" || f.date !== "all" || f.account || f.category || f.currency);
}

async function load(filters: Filters) {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const gateway = transactionsGateway();
    // El periodo de hoy (Safe to Spend, en la moneda principal), para la semana
    // o la quincena. Si falla, solo no se ofrecen esos filtros.
    const periodCall = map.safeToSpend(token).then(
      (sts): FinancialPeriod => ({
        kind: periodKind(sts.period_starts_on, sts.period_ends_on),
        startsOn: sts.period_starts_on,
        endsOn: sts.period_ends_on,
      }),
      () => null,
    );
    // Con un filtro por periodo, la lista necesita el rango antes de pedirse.
    const period =
      filters.date === "period" || filters.date === "lastPeriod" ? await periodCall : undefined;
    // REQ-056: "Metas" es otra lista de la API, la de los aportes y retiros.
    const goals = filters.kind === "goals";
    const isTwoCol = filters.view === "two-column";
    const [page, goalMovementsPage, accounts, categories, currencies, preferences] = await Promise.all([
      goals
        ? gateway.goalMovements(token, toGoalMovementsQuery(filters, isoToday(), period))
        : gateway.list(token, toQuery(filters, isoToday(), period)),
      isTwoCol && !goals
        ? gateway
            .goalMovements(token, toGoalMovementsQuery(filters, isoToday(), period))
            .catch(() => ({ items: [] as GoalMovement[], next_cursor: null }))
        : Promise.resolve({ items: [] as GoalMovement[], next_cursor: null }),
      gateway.accounts(token),
      map.categories(token),
      map.currencies(token),
      map.preferences(token).catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    const active = accounts.filter((a) => !a.archived_at);
    return {
      items: goals ? [] : byKind(page.items as Transaction[], filters.kind, filters.account),
      goals: goals ? (page.items as GoalMovement[]) : null,
      allGoalMovements: goalMovementsPage.items as GoalMovement[],
      nextCursor: page.next_cursor,
      accounts,
      activeAccounts: active,
      categories,
      catalog,
      currencies: catalog.order(new Set(active.map((a) => a.currency))),
      hidden: hiddenAmounts,
      period: await periodCall,
    };
  });
}
