import type { ComponentProps, ReactNode } from "react";

/** La tarjeta de vidrio del Map y de las pantallas internas. */
export function GlassCard({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`glass min-w-0 rounded-[26px] p-4 sm:px-[22px] sm:py-5 ${className}`}
      {...props}
    />
  );
}

/** Título de una tarjeta, con una acción opcional a la derecha. */
export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 text-[15px] font-extrabold">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

type Tone = "primary" | "green" | "coral" | "amber" | "orange";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-text",
  green: "bg-green-soft text-green-text",
  coral: "bg-coral-soft text-coral-text",
  amber: "bg-amber-soft text-amber-text",
  orange: "bg-orange-soft text-orange-text",
};

/** Etiqueta corta de estado ("Vas bien", "Muy rápido"…). */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Barra de avance. `percent` va de 0 a 100 y solo dibuja: no es un monto. */
export function ProgressTrack({
  percent,
  tone = "primary",
  label,
}: {
  percent: number;
  tone?: Tone;
  label: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const fill: Record<Tone, string> = {
    primary: "bg-primary",
    green: "bg-green",
    coral: "bg-coral",
    amber: "bg-amber",
    orange: "bg-orange",
  };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="bg-well relative h-2.5 flex-1 overflow-hidden rounded-full"
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${fill[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
