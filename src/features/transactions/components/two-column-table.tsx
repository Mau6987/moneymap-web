import Link from "next/link";

import { cx } from "@/lib/cx";
import { weekdayDate } from "@/lib/dates";
import { useServerMessages } from "@/lib/i18n/server";
import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { Category, Transaction } from "../../map/data/map-gateway";
import type { Account, GoalMovement } from "../data/transactions-gateway";

interface ColumnItem {
  id: string;
  title: string;
  subtitle: string;
  color?: string;
  amount: string;
  currency: string;
  editUrl?: string;
}

/**
 * Listado de movimientos en dos columnas (Ingresos / Egresos):
 * - Las transferencias se registran en ambas (egreso en origen, ingreso en destino).
 * - Los aportes a metas se registran en ambas (salida de cuenta, ingreso a la meta).
 */
export function TwoColumnTransactionsTable({
  items,
  goalMovements = [],
  accounts,
  categories,
  catalog,
  hidden,
  today,
  editHref,
}: {
  items: Transaction[];
  goalMovements?: GoalMovement[];
  accounts: Account[];
  categories: Category[];
  catalog: CurrencyCatalog;
  hidden: boolean;
  today: string;
  editHref?: (id: string) => string;
}) {
  const i18n = useServerMessages();
  const t = i18n.transactions;
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  const dayTitle = (iso: string) =>
    iso === today
      ? t.today
      : iso === yesterdayOf(today)
        ? t.yesterday
        : weekdayDate(iso, i18n.locale);

  // Collect all unique days
  const daysSet = new Set<string>();
  for (const tx of items) daysSet.add(tx.occurred_on);
  for (const gm of goalMovements) daysSet.add(gm.occurred_on);
  const days = [...daysSet].sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-6" data-testid="two-column-transactions">
      {days.map((day) => {
        const dayTxs = items.filter((tx) => tx.occurred_on === day);
        const dayGoals = goalMovements.filter((gm) => gm.occurred_on === day);

        const incomes: ColumnItem[] = [];
        const expenses: ColumnItem[] = [];

        for (const tx of dayTxs) {
          const category = categories.find((c) => c.id === tx.category_id);
          const color = category?.color ?? "var(--mm-primary)";
          const catName = category?.name ?? t.noCategory;

          if (tx.kind === "income") {
            incomes.push({
              id: tx.id,
              title: tx.description || catName,
              subtitle: accountName(tx.account_id),
              color,
              amount: tx.amount,
              currency: tx.currency,
              editUrl: editHref ? editHref(tx.id) : undefined,
            });
          } else if (tx.kind === "expense") {
            expenses.push({
              id: tx.id,
              title: tx.description || catName,
              subtitle: accountName(tx.account_id),
              color,
              amount: tx.amount,
              currency: tx.currency,
              editUrl: editHref ? editHref(tx.id) : undefined,
            });
          } else if (tx.kind === "transfer") {
            // Transfers appear in both columns
            expenses.push({
              id: `tr-out-${tx.id}`,
              title: tx.description || t.transferLabel,
              subtitle: `${accountName(tx.account_id)} →`,
              color: "var(--mm-muted)",
              amount: tx.amount,
              currency: tx.currency,
            });
            incomes.push({
              id: `tr-in-${tx.id}`,
              title: tx.description || t.transferLabel,
              subtitle: `→ ${accountName(tx.transfer_account_id)}`,
              color: "var(--mm-muted)",
              amount: tx.amount,
              currency: tx.currency,
            });
          }
        }

        for (const gm of dayGoals) {
          if (gm.kind === "contribution") {
            // Outflow from account, Inflow to goal
            expenses.push({
              id: `goal-out-${gm.id}`,
              title: t.goalContribution(gm.goal_name),
              subtitle: accountName(gm.account_id),
              color: "var(--mm-primary)",
              amount: gm.amount,
              currency: gm.currency,
            });
            incomes.push({
              id: `goal-in-${gm.id}`,
              title: gm.goal_name,
              subtitle: t.goalContribution(gm.goal_name),
              color: "var(--mm-primary)",
              amount: gm.amount,
              currency: gm.currency,
            });
          } else {
            // Withdrawal: Outflow from goal, Inflow to account
            expenses.push({
              id: `goal-out-${gm.id}`,
              title: gm.goal_name,
              subtitle: t.goalWithdrawal(gm.goal_name),
              color: "var(--mm-primary)",
              amount: gm.amount,
              currency: gm.currency,
            });
            incomes.push({
              id: `goal-in-${gm.id}`,
              title: t.goalWithdrawal(gm.goal_name),
              subtitle: accountName(gm.account_id),
              color: "var(--mm-primary)",
              amount: gm.amount,
              currency: gm.currency,
            });
          }
        }

        return (
          <section key={day} aria-label={dayTitle(day)} className="flex flex-col gap-2">
            <h3 className="text-muted px-2 text-xs font-bold uppercase tracking-wider">
              {dayTitle(day)}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Columna Ingresos */}
              <div className="bg-well/60 rounded-2xl p-3">
                <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                  <span className="text-green-text text-xs font-extrabold uppercase tracking-wide">
                    {t.incomes} ({incomes.length})
                  </span>
                </div>
                {incomes.length === 0 ? (
                  <p className="text-muted py-4 text-center text-xs">—</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {incomes.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: item.color }}
                          />
                          <div className="min-w-0">
                            {item.editUrl ? (
                              <Link
                                href={item.editUrl}
                                scroll={false}
                                className="focus-ring block truncate text-sm font-bold hover:underline"
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-bold">{item.title}</p>
                            )}
                            <p className="text-muted truncate text-xs">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-green-text shrink-0 text-sm font-extrabold tabular-nums whitespace-nowrap">
                          {formatMoney(item.amount, item.currency, catalog, { hidden, sign: "+" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Columna Egresos */}
              <div className="bg-well/60 rounded-2xl p-3">
                <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                  <span className="text-coral-text text-xs font-extrabold uppercase tracking-wide">
                    {t.expenses} ({expenses.length})
                  </span>
                </div>
                {expenses.length === 0 ? (
                  <p className="text-muted py-4 text-center text-xs">—</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {expenses.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: item.color }}
                          />
                          <div className="min-w-0">
                            {item.editUrl ? (
                              <Link
                                href={item.editUrl}
                                scroll={false}
                                className="focus-ring block truncate text-sm font-bold hover:underline"
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-bold">{item.title}</p>
                            )}
                            <p className="text-muted truncate text-xs">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-coral-text shrink-0 text-sm font-extrabold tabular-nums whitespace-nowrap">
                          {formatMoney(item.amount, item.currency, catalog, { hidden, sign: "−" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function yesterdayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

