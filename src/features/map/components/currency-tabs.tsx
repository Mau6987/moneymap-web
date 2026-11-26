import Link from "next/link";

import { cx } from "@/lib/cx";

import { ALL_CURRENCIES } from "../map-data";

import { useServerMessages } from "@/lib/i18n/server";
/**
 * Spec 004, RF-3: una pestaña por moneda con cuentas y "Todas", que las
 * muestra por separado. Con una sola moneda no hay pestañas. En un mes
 * pasado (`month`, BUG-040) se queda en ese mes y no hay "Todas", como la app.
 */
export function CurrencyTabs({
  codes,
  selected,
  month,
}: {
  codes: string[];
  selected: string;
  month?: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  if (codes.length < 2) return null;
  const tabs = month ? codes : [...codes, ALL_CURRENCIES];
  return (
    <nav aria-label={t.currencyTabs} className="flex flex-wrap gap-2">
      {tabs.map((code) => {
        const current = code === selected;
        return (
          <Link
            key={code}
            href={`/map?${month ? `month=${month.slice(0, 7)}&` : ""}currency=${code}`}
            aria-current={current ? "page" : undefined}
            data-testid={`map-currency-${code}`}
            className={cx(
              "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
              current
                ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                : "glass text-ink-2",
            )}
          >
            {code === ALL_CURRENCIES ? t.all : code}
          </Link>
        );
      })}
    </nav>
  );
}
