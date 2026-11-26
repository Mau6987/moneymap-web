import Link from "next/link";

import { cx } from "@/lib/cx";
import { weekdayDate } from "@/lib/dates";

import type { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { Category, Transaction } from "../../map/data/map-gateway";
import type { Account } from "../data/transactions-gateway";
import { directionOf } from "../domain/filters";

import { useServerMessages } from "@/lib/i18n/server";
/**
 * El historial (mockup "Web-Movimientos"): la categoría, la cuenta y el monto
 * de cada movimiento, agrupados por día y el más nuevo primero. Los gastos en coral con
 * "−", los ingresos en verde con "+" y las transferencias con "origen → destino".
 */
export function TransactionsTable({
  items,
  accounts,
  categories,
  catalog,
  hidden,
  account,
  today,
  editHref,
}: {
  items: Transaction[];
  accounts: Account[];
  categories: Category[];
  catalog: CurrencyCatalog;
  hidden: boolean;
  /** La cuenta filtrada: una transferencia que llega a ella es dinero que entra. */
  account: string;
  /** Hoy en ISO, para llamar "Hoy" y "Ayer" a los dos primeros días. */
  today: string;
  /** El enlace que abre un gasto o un ingreso para corregirlo o borrarlo. */
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
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
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
      {byDay(items).map(([day, txs]) => (
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
          {txs.map((tx) => {
            const category = categories.find((c) => c.id === tx.category_id);
            const transfer = tx.kind === "transfer";
            const direction = directionOf(tx, account);
            const sign = direction === "in" ? "+" : direction === "out" ? "−" : undefined;
            return (
              <tr key={tx.id} data-testid={`transaction-${tx.id}`} className="align-middle">
                <td className="border-line border-t px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: category?.color ?? "var(--mm-primary)" }}
                    />
                    <span className="min-w-0">
                      <b className="block truncate">
                        {editHref && !transfer ? (
                          <Link
                            href={editHref(tx.id)}
                            scroll={false}
                            aria-label={t.edit.open(tx.description || category?.name || "")}
                            className="focus-ring hover:underline"
                          >
                            {tx.description || category?.name || "—"}
                          </Link>
                        ) : (
                          tx.description || category?.name || (transfer ? t.transferLabel : "—")
                        )}
                      </b>
                      <span className="text-muted text-xs font-semibold">
                        <span className="md:hidden">
                          {transfer
                            ? t.transfer(
                                accountName(tx.account_id),
                                accountName(tx.transfer_account_id),
                              )
                            : (category?.name ?? t.noCategory)}
                        </span>
                      </span>
                    </span>
                  </span>
                </td>
                <td className="border-line text-ink-2 border-t px-3 py-2.5 max-md:hidden">
                  {transfer ? t.transferLabel : (category?.name ?? t.noCategory)}
                </td>
                <td className="border-line text-ink-2 border-t px-3 py-2.5 max-md:hidden">
                  {transfer
                    ? t.transfer(accountName(tx.account_id), accountName(tx.transfer_account_id))
                    : accountName(tx.account_id)}
                </td>
                <td
                  className={cx(
                    "border-line border-t px-3 py-2.5 text-right font-extrabold whitespace-nowrap tabular-nums",
                    sign === "+" && "text-green-text",
                    sign === "−" && "text-coral-text",
                  )}
                >
                  {formatMoney(tx.amount, tx.currency, catalog, { hidden, sign })}
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}

/** Los movimientos en grupos de un mismo día, en el orden en que llegan. */
export function byDay(items: Transaction[]): [string, Transaction[]][] {
  const days = new Map<string, Transaction[]>();
  for (const tx of items) days.set(tx.occurred_on, [...(days.get(tx.occurred_on) ?? []), tx]);
  return [...days];
}

function yesterdayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
