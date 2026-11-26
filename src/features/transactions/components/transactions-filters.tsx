import Link from "next/link";

import { Icon } from "@/components/icon";
import { cx } from "@/lib/cx";

import type { Category } from "../../map/data/map-gateway";
import type { Account } from "../data/transactions-gateway";
import {
  activeCount,
  filtersHref,
  type Filters,
  type KindFilter,
  type FinancialPeriod,
} from "../domain/filters";

import { useServerMessages } from "@/lib/i18n/server";
const field =
  "focus-ring bg-field border-line h-11 w-full rounded-[14px] border px-3 text-sm font-semibold";
const label = "text-muted mb-1 block text-xs font-bold";

/**
 * La barra de filtros de Movimientos. Es un formulario GET: funciona sin
 * JavaScript y cada combinación de filtros tiene su propia URL.
 */
export function TransactionsFilters({
  filters,
  accounts,
  categories,
  currencies,
  period,
}: {
  filters: Filters;
  accounts: Account[];
  categories: Category[];
  currencies: string[];
  /** El periodo de hoy, para ofrecer la semana o la quincena. */
  period?: FinancialPeriod | null;
}) {
  const i18n = useServerMessages();
  const t = i18n.transactions;
  const kinds: [KindFilter, string][] = [
    ["all", t.all],
    ["expense", t.expenses],
    ["income", t.incomes],
    ["transfer", t.transfers],
    ["goals", t.goals],
  ];
  const active = activeCount(filters);
  return (
    <section aria-label={t.filters} className="glass flex flex-col gap-3 rounded-[26px] p-4">
      <nav aria-label={t.kinds} className="flex flex-wrap gap-2">
        {kinds.map(([kind, text]) => (
          <Link
            key={kind}
            href={filtersHref(filters, { kind })}
            aria-current={filters.kind === kind ? "page" : undefined}
            className={cx(
              "focus-ring inline-flex h-9 items-center rounded-full px-4 text-sm font-bold",
              filters.kind === kind
                ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                : "bg-well text-ink-2",
            )}
          >
            {text}
          </Link>
        ))}
      </nav>
      <form action="/transactions" method="get" className="flex flex-col gap-3">
        {filters.kind !== "all" && <input type="hidden" name="kind" value={filters.kind} />}
        <label>
          <span className="sr-only">{t.search}</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={t.search}
            maxLength={200}
            className={field}
          />
        </label>
        {/* Los filtros de fecha, cuenta, categoría y moneda se pliegan: la lista
            queda arriba y solo se abren solos si hay alguno puesto. */}
        <details open={active > 0} className="group" data-testid="transactions-more-filters">
          <summary className="focus-ring text-primary-text inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full text-sm font-bold [&::-webkit-details-marker]:hidden">
            <Icon name="chevron" className="size-4 transition-transform group-open:rotate-90" />
            {active > 0 ? `${t.filters} · ${active}` : t.filters}
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="xl:col-span-2">
                <span className={label}>{t.date}</span>
                <select name="date" defaultValue={filters.date} className={field}>
                  <option value="all">{t.anyDate}</option>
                  <option value="month">{t.thisMonth}</option>
                  <option value="last">{t.lastMonth}</option>
                  {/* Como la app: la semana o la quincena de la persona, si no es mensual. */}
                  {period && period.kind !== "monthly" && (
                    <>
                      <option value="period">{t.periods[period.kind]?.[0]}</option>
                      <option value="lastPeriod">{t.periods[period.kind]?.[1]}</option>
                    </>
                  )}
                  <option value="range">{t.range}</option>
                </select>
              </label>
              <label>
                <span className={label}>{t.from}</span>
                <input type="date" name="from" defaultValue={filters.from} className={field} />
              </label>
              <label>
                <span className={label}>{t.to}</span>
                <input type="date" name="to" defaultValue={filters.to} className={field} />
              </label>
              <label className="xl:col-span-2">
                <span className={label}>{t.account}</span>
                <select name="account" defaultValue={filters.account} className={field}>
                  <option value="">{t.anyAccount}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {currencies.length > 1 ? `${a.name} · ${a.currency}` : a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="xl:col-span-3">
                <span className={label}>{t.category}</span>
                <select name="category" defaultValue={filters.category} className={field}>
                  <option value="">{t.anyCategory}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {currencies.length > 1 && (
                <label className="xl:col-span-3">
                  <span className={label}>{t.currency}</span>
                  <select name="currency" defaultValue={filters.currency} className={field}>
                    <option value="">{t.anyCurrency}</option>
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/transactions"
                className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
              >
                {t.clear}
              </Link>
              <button
                type="submit"
                className="focus-ring bg-primary inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-white"
              >
                {t.apply}
              </button>
            </div>
          </div>
        </details>
      </form>
    </section>
  );
}
