import { randomUUID } from "node:crypto";

import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";
import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { RecurringRule } from "../data/recurring-gateway";
import { PayForm, type PayAccount } from "./pay-form";

import { useServerMessages } from "@/lib/i18n/server";

/**
 * Los fijos vencidos en naranja: un aviso, no un movimiento. Cada uno con su
 * botón para registrarlo hoy; al registrarlo vuelve a `back`.
 */
export function DueList({
  rules,
  today,
  catalog,
  hidden,
  back,
  accounts,
  compact = false,
}: {
  rules: RecurringRule[];
  today: string;
  catalog: CurrencyCatalog;
  hidden: boolean;
  back: "/map";
  /** Las cuentas con que se puede pagar, con su moneda (BUG-027). */
  accounts: (PayAccount & { currency: string })[];
  /** En el Map van más juntos, sin la fecha completa. */
  compact?: boolean;
}) {
  const i18n = useServerMessages();
  const t = i18n.payables;
  return (
    <ul className={cx("flex flex-col", compact ? "gap-2" : "gap-2.5")} data-testid="due-list">
      {rules.map((rule) => {
        const income = rule.type === "income";
        return (
          <li
            key={rule.id}
            data-testid={`due-${rule.id}`}
            className="bg-orange-soft flex flex-wrap items-center gap-3 rounded-[16px] px-3 py-2 text-sm"
          >
            <span aria-hidden="true" className="bg-orange size-2.5 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1">
              <b className="block truncate">{rule.description}</b>
              <span className="text-orange-text text-xs font-bold">
                {income ? `${t.toCollect} · ` : ""}
                {rule.next_due_on === today
                  ? t.dueToday
                  : t.dueOn(shortDate(rule.next_due_on, i18n.locale))}
              </span>
            </span>
            <span className="text-orange-text font-extrabold whitespace-nowrap tabular-nums">
              {formatMoney(rule.amount, rule.currency, catalog, {
                hidden,
                sign: income ? "+" : "−",
              })}
            </span>
            <PayForm
              ruleId={rule.id}
              kind={income ? "income" : "expenses"}
              label={income ? t.collect : t.pay}
              accounts={accounts.filter((a) => a.currency === rule.currency)}
              defaultAccount={rule.account_id}
              idempotencyKey={randomUUID()}
              back={back}
              currency={rule.currency}
              compact={compact}
            />
          </li>
        );
      })}
    </ul>
  );
}
