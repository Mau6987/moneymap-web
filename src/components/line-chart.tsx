import Decimal from "decimal.js";

import { cx } from "@/lib/cx";

export interface LineSeries {
  /** Montos de la API, como texto; solo se pasan a número para dibujar. */
  values: readonly string[];
  tone: "primary" | "green" | "coral" | "muted";
  /** Punteada: lo que sería (antes/después de un escenario, la proyección). */
  dashed?: boolean;
  /** En qué punto empieza; por omisión, el primero. */
  start?: number;
}

const stroke: Record<LineSeries["tone"], string> = {
  primary: "stroke-[var(--mm-primary)]",
  green: "stroke-[var(--mm-green)]",
  coral: "stroke-[var(--mm-coral)]",
  muted: "stroke-[var(--mm-muted)]",
};

const fill: Record<LineSeries["tone"], string> = {
  primary: "fill-[var(--mm-primary)]",
  green: "fill-[var(--mm-green)]",
  coral: "fill-[var(--mm-coral)]",
  muted: "fill-[var(--mm-muted)]",
};

/**
 * Una o varias líneas sobre los mismos puntos (Forecast, What If?, metas):
 * el área bajo la primera, la línea del cero si alguna baja de cero y el
 * punto `highlight` marcado. Solo dibuja: los montos se leen en la tarjeta.
 */
export function LineChart({
  series,
  labels,
  highlight,
  guide,
  label,
  className,
}: {
  series: readonly LineSeries[];
  /** Una etiqueta por punto, debajo del eje ("Hoy", "30", "60", "90"). */
  labels: readonly string[];
  highlight?: number;
  /** Una línea horizontal punteada en verde: el objetivo de una meta. */
  guide?: string;
  /** Lo que lee un lector de pantalla: los montos en texto. */
  label: string;
  className?: string;
}) {
  const all = [
    ...series.flatMap((s) => s.values.map((v) => new Decimal(v))),
    ...(guide === undefined ? [] : [new Decimal(guide)]),
  ];
  if (all.length === 0) return null;
  // La escala sigue a los valores, con aire arriba y abajo; el cero entra solo
  // si algún saldo baja de cero, para que una subida chica se note.
  const hi = Decimal.max(...all);
  const lo = Decimal.min(...all);
  const room = hi.minus(lo).isZero()
    ? Decimal.max(hi.abs(), 1).times(0.2)
    : hi.minus(lo).times(0.25);
  const max = hi.plus(room);
  const min = lo.isNegative() ? Decimal.min(lo.minus(room), 0) : Decimal.max(lo.minus(room), 0);
  const span = max.minus(min);
  const points = Math.max(...series.map((s) => (s.start ?? 0) + s.values.length));

  const width = 600;
  const height = 200;
  const pad = 14;
  const x = (i: number) => pad + (points <= 1 ? 0 : (i / (points - 1)) * (width - 2 * pad));
  const y = (v: Decimal) => pad + (1 - v.minus(min).div(span).toNumber()) * (height - 2 * pad);
  const path = (values: readonly string[], start = 0) =>
    values
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"}${x(start + i).toFixed(1)},${y(new Decimal(v)).toFixed(1)}`,
      )
      .join(" ");

  const first = series[0]!;
  const firstStart = first.start ?? 0;
  const area = `${path(first.values, firstStart)} L${x(firstStart + first.values.length - 1).toFixed(1)},${(height - pad).toFixed(1)} L${x(firstStart).toFixed(1)},${(height - pad).toFixed(1)} Z`;

  return (
    <figure className={cx("min-w-0", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={label}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={pad + f * (height - 2 * pad)}
            y2={pad + f * (height - 2 * pad)}
            className="stroke-[var(--mm-line)]"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {min.isNegative() && (
          <line
            x1={0}
            x2={width}
            y1={y(new Decimal(0))}
            y2={y(new Decimal(0))}
            strokeDasharray="6 6"
            strokeWidth={1.5}
            className="stroke-[var(--mm-coral)]"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {guide !== undefined && (
          <line
            x1={0}
            x2={width}
            y1={y(new Decimal(guide))}
            y2={y(new Decimal(guide))}
            strokeDasharray="6 6"
            strokeWidth={1.5}
            className="stroke-[var(--mm-green)]"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path d={area} className={cx(fill[first.tone], "opacity-10")} />
        {series.map((s, i) => (
          <path
            key={i}
            d={path(s.values, s.start)}
            fill="none"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? "8 7" : undefined}
            vectorEffect="non-scaling-stroke"
            className={stroke[s.tone]}
          />
        ))}
        {highlight !== undefined && first.values[highlight - firstStart] !== undefined && (
          <circle
            cx={x(highlight)}
            cy={y(new Decimal(first.values[highlight - firstStart]!))}
            r={6}
            strokeWidth={3}
            className={cx(stroke[first.tone], "fill-[var(--mm-bg)]")}
          />
        )}
      </svg>
      <figcaption
        aria-hidden="true"
        className="text-muted mt-1 flex justify-between text-[11px] font-bold"
      >
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className={cx(i === highlight && "text-ink")}>
            {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
