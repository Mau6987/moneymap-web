import Decimal from "decimal.js";

import { cx } from "@/lib/cx";

export interface BarGroup {
  label: string;
  /** Montos de la API, uno por barra, en el orden de `legend`. */
  values: readonly string[];
  tone: "primary" | "green" | "coral" | "amber";
}

const fill: Record<BarGroup["tone"], string> = {
  primary: "bg-primary",
  green: "bg-green",
  coral: "bg-coral",
  amber: "bg-amber",
};

/**
 * Barras agrupadas (Money Story: este mes contra el anterior; presupuestos: el
 * gasto por semana). La última barra de cada grupo va con el color del grupo y
 * las anteriores, apagadas. Un monto negativo dibuja su tamaño en coral. Solo
 * dibuja: los montos se leen al lado.
 */
export function BarGroups({
  groups,
  legend,
  label,
}: {
  groups: readonly BarGroup[];
  /** Qué es cada barra del grupo ("Septiembre", "Octubre"); sin leyenda si hay una sola. */
  legend?: readonly string[];
  label: string;
}) {
  const top = Decimal.max(1, ...groups.flatMap((g) => g.values.map((v) => new Decimal(v).abs())));
  return (
    <figure className="mt-3">
      <div role="img" aria-label={label} className="flex h-32 items-end gap-4">
        {groups.map((g) => (
          <div
            key={g.label}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-1.5"
          >
            {g.values.map((v, i) => {
              const amount = new Decimal(v);
              const last = i === g.values.length - 1;
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  className={cx(
                    "w-full max-w-7 rounded-t-[8px] rounded-b-[3px]",
                    amount.isNegative() ? "bg-coral" : last ? fill[g.tone] : "bg-well",
                    !last && "opacity-80",
                  )}
                  style={{ height: `max(${amount.abs().div(top).times(100).toNumber()}%, 3px)` }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <figcaption aria-hidden="true" className="mt-2 flex gap-4">
        {groups.map((g) => (
          <span key={g.label} className="text-muted flex-1 text-center text-[11px] font-bold">
            {g.label}
          </span>
        ))}
      </figcaption>
      {legend && legend.length > 1 && (
        <p
          aria-hidden="true"
          className="text-muted mt-2 flex justify-center gap-4 text-[11px] font-semibold"
        >
          {legend.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span
                className={cx(
                  "size-2.5 rounded-sm",
                  i === legend.length - 1 ? "bg-primary" : "bg-well",
                )}
              />
              {l}
            </span>
          ))}
        </p>
      )}
    </figure>
  );
}
