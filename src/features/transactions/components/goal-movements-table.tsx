import { cx } from "@/lib/cx";
import { weekdayDate } from "@/lib/dates";

import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { Account, GoalMovement } from "../data/transactions-gateway";

import { useServerMessages } from "@/lib/i18n/server";
/**
 * REQ-056, el filtro "Metas" de Movimientos: cada aporte y retiro con su meta,
 * su cuenta y el monto, agrupados por día como el historial. Mirado desde la
 * cuenta: el aporte sale (coral, "−") y el retiro vuelve (verde, "+").
 */
export function GoalMovementsTable({
  items,
  accounts,
  catalog,
  hidden,
  today,
}: {
  items: GoalMovement[];
  accounts: Account[];
  catalog: CurrencyCatalog;
  hidden: boolean;
  /** Hoy en ISO, para llamar "Hoy" y "Ayer" a los dos primeros días. */
  today: string;
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
  return (
    <table className="w-full border-separate border-spacing-0 text-sm" data-testid="goal-movements">
      <thead className="max-md:sr-only">
        <tr className="text-muted text-left text-xs font-bold">
          <th scope="col" className="px-3 pb-2">
            {t.columns.movement}
          </th>
          <th scope="col" className="px-3 pb-2">
            {t.columns.category}
          </th>
          <th scope="col" className="px-3 pb-2">
            {t.columns.account}
          </th>
          <th scope="col" className="px-3 pb-2 text-right">
            {t.columns.amount}
          </th>
        </tr>
      </thead>
      {byDay(items).map(([day, movements]) => (
        <tbody key={day}>
          <tr>
            <th
              scope="colgroup"
              colSpan={4}
              className="text-muted px-3 pt-4 pb-1.5 text-left text-xs font-bold"
            >
              {dayTitle(day)}
            </th>
          </tr>
          {movements.map((m) => {
            const contribution = m.kind === "contribution";
            const sign = contribution ? "−" : "+";
            return (
              <tr key={m.id} data-testid={`goal-movement-${m.id}`} className="align-middle">
                <td className="border-line border-t px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-primary size-2.5 shrink-0 rounded-full"
                    />
                    <span className="min-w-0">
                      <b className="block truncate">
                        {contribution
                          ? t.goalContribution(m.goal_name)
                          : t.goalWithdrawal(m.goal_name)}
                      </b>
                      <span className="text-muted text-xs font-semibold md:hidden">
                        {accountName(m.account_id)}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="border-line text-ink-2 border-t px-3 py-2.5 max-md:hidden">
                  {t.goalLabel}
                </td>
                <td className="border-line text-ink-2 border-t px-3 py-2.5 max-md:hidden">
                  {accountName(m.account_id)}
                </td>
                <td
                  className={cx(
                    "border-line border-t px-3 py-2.5 text-right font-extrabold whitespace-nowrap tabular-nums",
                    contribution ? "text-coral-text" : "text-green-text",
                  )}
                >
                  {formatMoney(m.amount, m.currency, catalog, { hidden, sign })}
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}

/** Los aportes y retiros en grupos de un mismo día, en el orden en que llegan. */
function byDay(items: GoalMovement[]): [string, GoalMovement[]][] {
  const days = new Map<string, GoalMovement[]>();
  for (const m of items) days.set(m.occurred_on, [...(days.get(m.occurred_on) ?? []), m]);
  return [...days];
}

function yesterdayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
