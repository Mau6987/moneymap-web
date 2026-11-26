import Decimal from "decimal.js";

import { cx } from "@/lib/cx";

export interface WaterfallStep {
  label: string;
  /** El monto de la API, positivo; `kind` dice si suma, resta o es el resultado. */
  amount: string;
  /** Lo que se muestra encima de la barra, ya formateado. */
  text: string;
  kind: "start" | "minus" | "result";
  tone: "ink" | "coral" | "primary" | "amber" | "green";
}

const bar: Record<WaterfallStep["tone"], string> = {
  ink: "bg-[rgb(21_25_54/0.9)] dark:bg-white/85",
  coral: "bg-coral",
  primary: "bg-primary",
  amber: "bg-amber",
  green: "bg-green",
};

const value: Record<WaterfallStep["tone"], string> = {
  ink: "text-ink",
  coral: "text-coral-text",
  primary: "text-primary-text",
  amber: "text-amber-text",
  green: "text-green-text",
};

/**
 * La cascada del mockup "Web-SafeToSpend": el saldo, lo que se le resta y lo
 * libre. Cada barra mide su monto de la API; las que restan cuelgan del nivel
 * en que quedó la anterior. Solo dibuja: no resta nada para mostrar un monto.
 */
export function WaterfallChart({
  steps,
  label,
}: {
  steps: readonly WaterfallStep[];
  label: string;
}) {
  const top = Decimal.max(1, ...steps.map((s) => new Decimal(s.amount).abs()));
  const pct = (amount: Decimal) => Decimal.min(100, amount.div(top).times(100)).toNumber();

  let level = new Decimal(0);
  const bars = steps.map((s) => {
    const amount = new Decimal(s.amount).abs();
    if (s.kind === "start") {
      level = amount;
      return { s, height: pct(amount), bottom: 0 };
    }
    if (s.kind === "minus") {
      level = Decimal.max(0, level.minus(amount));
      return { s, height: pct(amount), bottom: pct(level) };
    }
    return { s, height: pct(amount), bottom: 0 };
  });

  return (
    <div role="img" aria-label={label} className="mt-4 grid grid-cols-5 items-end gap-2 sm:gap-4">
      {bars.map(({ s, height, bottom }) => (
        <div key={s.label} className="flex min-w-0 flex-col items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cx("text-xs font-extrabold tabular-nums sm:text-[13px]", value[s.tone])}
          >
            {s.text}
          </span>
          <div aria-hidden="true" className="relative h-36 w-full max-w-16">
            <div
              className={cx("absolute inset-x-0 rounded-[10px]", bar[s.tone])}
              style={{ bottom: `${bottom}%`, height: `max(${height}%, 4px)` }}
            />
          </div>
          <span
            aria-hidden="true"
            className="text-muted text-center text-[11px] font-bold sm:text-xs"
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
