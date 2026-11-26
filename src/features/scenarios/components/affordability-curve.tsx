import Decimal from "decimal.js";
import { useId } from "react";

import { cx } from "@/lib/cx";

/** Puntos del eje de abajo: todos si son pocos; si no, el primero, el del medio y el último. */
const MAX_TICKS = 7;

/**
 * La proyección del saldo de Can I Afford It? (spec 005, RF-14): desde lo
 * disponible hoy hasta el mes en que la compra entra, con el precio como línea
 * punteada. Los montos los da la API; acá solo se dibujan (por eso pasan a
 * `number`, como las barras y los anillos). Las líneas van en SVG y las
 * etiquetas en HTML, así el texto no se deforma con el ancho.
 */
export function AffordabilityCurve({
  points,
  amount,
  todayLabel,
  priceTag,
  todayTag,
  tickLabel,
  savingsLabel,
  priceLabel,
  label,
}: {
  /** Los saldos proyectados, el más viejo primero. */
  points: readonly { on: string; balance: string }[];
  amount: string;
  todayLabel: string;
  /** "Precio · Bs 9.000", ya con el modo privado aplicado. */
  priceTag: string;
  /** Lo disponible hoy, ya formateado. */
  todayTag: string;
  /** El mes corto de una fecha ("dic 2026"). */
  tickLabel: (iso: string) => string;
  savingsLabel: string;
  priceLabel: string;
  label: string;
}) {
  const gradient = useId();
  const values = points.map((p) => new Decimal(p.balance).toNumber());
  const price = new Decimal(amount).toNumber();
  // La escala va del saldo más bajo al precio (o el saldo más alto), con aire:
  // así se ve cuánto sube el ahorro hasta llegar.
  const low0 = Math.min(...values, price);
  const high0 = Math.max(...values, price);
  const span = high0 - low0 || Math.abs(high0) || 1;
  const low = low0 - span * 0.35;
  const high = high0 + span * 0.25;
  const count = values.length;
  const x = (i: number) => (count < 2 ? 50 : (i / (count - 1)) * 100);
  const y = (v: number) => (1 - (v - low) / (high - low)) * 100;
  const coords = values.map((v, i) => [x(i), y(v)] as const);
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last) return null;

  // Curva monótona (Fritsch–Carlson): suave como la de la app, pero nunca se
  // pasa de un punto al siguiente, así no parece que el ahorro baja o sobra.
  const n = coords.length;
  const dx = (i: number) => (coords[i + 1]?.[0] ?? 0) - (coords[i]?.[0] ?? 0);
  const slope = (i: number) => ((coords[i + 1]?.[1] ?? 0) - (coords[i]?.[1] ?? 0)) / (dx(i) || 1);
  const tangents = coords.map((_, i) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const s0 = slope(i - 1);
    const s1 = slope(i);
    return s0 * s1 <= 0 ? 0 : (2 * s0 * s1) / (s0 + s1);
  });
  let line = `M${first[0]},${first[1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = coords[i] ?? first;
    const p2 = coords[i + 1] ?? last;
    const h = dx(i) / 3;
    line += ` C${p1[0] + h},${p1[1] + h * (tangents[i] ?? 0)} ${p2[0] - h},${p2[1] - h * (tangents[i + 1] ?? 0)} ${p2[0]},${p2[1]}`;
  }
  const area = `${line} L${last[0]},100 L${first[0]},100 Z`;
  const priceY = y(price);
  const ticks =
    count <= MAX_TICKS
      ? points.map((p, i) => ({ at: x(i), on: p.on }))
      : [0, Math.floor((count - 1) / 2), count - 1].map((i) => ({
          at: x(i),
          on: points[i]?.on ?? "",
        }));

  return (
    <figure className="bg-well flex flex-col gap-3 rounded-[20px] p-4" data-testid="afford-curve">
      <div role="img" aria-label={label} className="relative mx-2 h-44 sm:h-52">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--mm-green)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--mm-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((g) => (
            <line
              key={g}
              x1="0"
              x2="100"
              y1={g}
              y2={g}
              stroke="var(--mm-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={`url(#${gradient})`} />
          <line
            x1="0"
            x2="100"
            y1={priceY}
            y2={priceY}
            stroke="var(--mm-amber)"
            strokeWidth="2"
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            fill="none"
            stroke="var(--mm-green)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden="true"
          className="bg-amber-soft text-amber-text num absolute left-0 -translate-y-[130%] rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap"
          style={{ top: `${priceY}%` }}
        >
          {priceTag}
        </span>
        <span
          aria-hidden="true"
          className="bg-green absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-[color-mix(in_srgb,var(--mm-green)_25%,transparent)]"
          style={{ left: `${first[0]}%`, top: `${first[1]}%` }}
        />
        <span
          aria-hidden="true"
          className="text-green-text num absolute translate-y-3 text-[11px] font-extrabold whitespace-nowrap"
          style={{ left: `${first[0]}%`, top: `${first[1]}%` }}
        >
          {todayTag}
        </span>
        <span
          aria-hidden="true"
          className="border-ink bg-field absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
          style={{ left: `${last[0]}%`, top: `${last[1]}%` }}
        />
      </div>
      <div aria-hidden="true" className="relative mx-2 h-4">
        {ticks.map((tick, i) => (
          <span
            key={tick.on}
            className={cx(
              "absolute text-[11px] whitespace-nowrap",
              i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
              // En pantallas angostas, solo hoy y el mes estimado.
              i > 0 && i < ticks.length - 1 && "hidden sm:inline",
              i === ticks.length - 1 ? "text-ink font-extrabold" : "text-muted font-semibold",
            )}
            style={{ left: `${tick.at}%` }}
          >
            {i === 0 ? todayLabel : tickLabel(tick.on)}
          </span>
        ))}
      </div>
      <figcaption
        aria-hidden="true"
        className="text-muted flex justify-center gap-5 text-xs font-semibold"
      >
        <span className="flex items-center gap-1.5">
          <span className="bg-green h-[3px] w-4 rounded" />
          {savingsLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-amber w-4 border-t-[3px] border-dashed" />
          {priceLabel}
        </span>
      </figcaption>
    </figure>
  );
}
