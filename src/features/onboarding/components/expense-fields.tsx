"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";
import { cx } from "@/lib/cx";
import { addAmounts } from "@/lib/money/format";
import { formatNumber } from "@/lib/money/money";
import { parseAmount } from "@/lib/money/parse";

import { EXAMPLE_EXPENSES } from "../domain/steps";

import { useMessages } from "@/lib/i18n/client";

/** El color y el nombre de la categoría de cada plantilla, para la fila. */
export type ExpenseCategories = Record<string, { name: string; color: string } | undefined>;

const FREQUENCIES = ["weekly", "biweekly", "monthly", "yearly"] as const;

interface Row {
  key: string;
  template: string;
  /** Las de ejemplo traen su nombre; las agregadas lo piden. */
  example?: string;
  name: string;
  amount: string;
  checked: boolean;
  frequency: (typeof FREQUENCIES)[number];
  due: string;
}

/**
 * "Tus gastos fijos del mes" (RF-6), como el paso 6 de la app (BUG-021): una
 * fila por gasto con su categoría, el monto y un check; al marcarlo, cada
 * cuánto se repite y cuándo vence. Debajo, "Agregar gasto fijo" y lo
 * comprometido al mes. Solo se guardan los marcados con monto.
 */
export function ExpenseFields({
  symbol,
  decimals,
  today,
  categories,
}: {
  /** El símbolo de la moneda principal ("Bs"). */
  symbol: string;
  decimals: number;
  /** Hoy en ISO: el primer vencimiento por defecto. */
  today: string;
  categories: ExpenseCategories;
}) {
  const i18n = useMessages();
  const t = i18n.onboarding.expenses;
  const frequencies = i18n.recurring.frequency;
  const [rows, setRows] = useState<Row[]>(
    EXAMPLE_EXPENSES.map((template) => ({
      key: template,
      template,
      example: t.examples[template],
      name: t.examples[template] ?? "",
      amount: "",
      checked: false,
      frequency: "monthly",
      due: today,
    })),
  );
  const [next, setNext] = useState(1);
  const update = (key: string, change: Partial<Row>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const amountOf = (row: Row) => parseAmount(row.amount, { decimals });
  const chosen = rows.filter((r) => r.checked && amountOf(r) !== null);
  const total = addAmounts(chosen.map((r) => amountOf(r)!));
  const colorOf = (row: Row) => categories[row.template]?.color ?? "var(--mm-primary)";

  return (
    <div className="flex flex-col gap-3">
      <ul className="bg-well flex flex-col divide-y divide-[var(--mm-line)] rounded-[22px] px-3.5">
        {rows.map((row) => {
          const label = row.example ?? (row.name || t.customName);
          return (
            <li
              key={row.key}
              className="flex flex-col gap-2 py-3"
              data-testid={`expense-${row.key}`}
            >
              <input type="hidden" name="template" value={row.template} />
              {/* Sin marcar, el gasto no se guarda: va sin monto. */}
              <input type="hidden" name="amount" value={row.checked ? row.amount : ""} />
              <input type="hidden" name="frequency" value={row.frequency} />
              <input type="hidden" name="due" value={row.due} />
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-[38px] shrink-0 place-items-center rounded-[12px] text-sm font-extrabold text-white"
                  style={{ background: colorOf(row) }}
                >
                  {(categories[row.template]?.name ?? label).charAt(0).toUpperCase()}
                </span>
                {row.example ? (
                  <>
                    <input type="hidden" name="name" value={row.example} />
                    <span className="min-w-0 flex-1 text-[15px] font-bold">{row.example}</span>
                  </>
                ) : (
                  <input
                    name="name"
                    value={row.name}
                    onChange={(e) => update(row.key, { name: e.target.value })}
                    maxLength={60}
                    placeholder={t.name}
                    aria-label={t.name}
                    className="bg-field border-line text-ink focus-ring h-11 min-w-0 flex-1 rounded-2xl border-[1.5px] px-3 text-[15px] font-semibold"
                  />
                )}
                <label className="bg-field border-line focus-within:outline-primary-text flex h-11 w-32 shrink-0 items-center gap-1.5 rounded-2xl border-[1.5px] px-3 focus-within:outline-2 focus-within:outline-offset-2">
                  <span className="text-muted text-sm font-bold">{symbol}</span>
                  <input
                    value={row.amount}
                    // Escribir un monto lo marca; borrarlo lo desmarca (como la app).
                    onChange={(e) =>
                      update(row.key, {
                        amount: e.target.value,
                        checked: e.target.value.trim() !== "",
                      })
                    }
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={t.amount(label)}
                    className="text-ink min-w-0 flex-1 bg-transparent text-right text-[15px] font-semibold outline-none"
                  />
                </label>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(e) => update(row.key, { checked: e.target.checked })}
                  aria-label={label}
                  className="accent-primary size-5 shrink-0"
                />
              </div>
              {row.checked && row.amount.trim() !== "" && (
                <div className="ml-[50px] flex flex-wrap gap-2">
                  <select
                    value={row.frequency}
                    onChange={(e) =>
                      update(row.key, { frequency: e.target.value as Row["frequency"] })
                    }
                    aria-label={t.frequency(label)}
                    className="bg-field border-line focus-ring h-10 rounded-[14px] border px-3 text-sm font-semibold"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {frequencies[f]}
                      </option>
                    ))}
                  </select>
                  <label className="text-primary-text flex h-10 items-center gap-2 text-sm font-bold">
                    <Icon name="calendar" className="size-4" />
                    <span>{t.due}</span>
                    <input
                      type="date"
                      value={row.due}
                      onChange={(e) => update(row.key, { due: e.target.value || today })}
                      className="bg-field border-line text-ink focus-ring h-10 rounded-[14px] border px-2 text-sm font-semibold"
                    />
                  </label>
                </div>
              )}
              {!row.example && (
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                  className="focus-ring text-muted ml-[50px] w-fit text-xs font-bold"
                >
                  {t.remove(label)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => {
          setRows([
            ...rows,
            {
              key: `custom-${next}`,
              template: "other_expense",
              name: "",
              amount: "",
              checked: false,
              frequency: "monthly",
              due: today,
            },
          ]);
          setNext(next + 1);
        }}
        className="focus-ring text-primary-text border-primary-text/45 flex h-[52px] items-center justify-center gap-2 rounded-[22px] border text-sm font-bold"
      >
        <Icon name="plus" className="size-4" />
        {t.add}
      </button>
      <section
        aria-label={t.committed}
        className="glass flex flex-col gap-3 rounded-[24px] px-[18px] py-4"
        data-testid="expenses-committed"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted text-xs font-semibold">{t.committed}</span>
          <span className="text-coral-text text-[22px] font-extrabold tabular-nums">
            {chosen.length > 0 ? "−" : ""}
            {symbol} {formatNumber(total, decimals)}
          </span>
        </div>
        {chosen.length > 0 && (
          <div aria-hidden="true" className="flex gap-1">
            {chosen.map((row) => (
              <span
                key={row.key}
                className={cx("h-2.5 rounded-[5px]")}
                style={{
                  background: colorOf(row),
                  // Solo para dibujar: unidades enteras alcanzan.
                  flexGrow: Math.max(1, Math.floor(Number(amountOf(row)))),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
