import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { Logo } from "./auth-shell";
import { Icon, type IconName } from "./icon";

/**
 * Las pantallas de estado (MM-182): 404, algo salió mal, MoneyMap no
 * responde y sin conexión. Una tarjeta de vidrio con el ícono en su
 * cuadrado de color, el título, qué pasó y qué hacer, igual en toda la web.
 * `fullScreen` la centra sola en la pantalla (fuera de la app o sin sesión);
 * sin él va dentro del marco de la app, con el menú a la vista.
 */
export function StatusScreen({
  icon,
  code,
  title,
  body,
  actions,
  detail,
  tone = "primary",
  fullScreen = false,
}: {
  icon: IconName;
  /** "Error 404": una etiqueta chica arriba del título. */
  code?: string;
  title: string;
  body: string;
  actions: ReactNode;
  /** Una línea chica al pie, como la referencia de un error. */
  detail?: string;
  tone?: "primary" | "coral";
  fullScreen?: boolean;
}) {
  const card = (
    <section
      role={tone === "coral" ? "alert" : undefined}
      aria-labelledby="status-title"
      className="glass relative w-full max-w-md rounded-[32px] px-6 py-9 text-center sm:px-10"
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative mx-auto grid size-16 place-items-center rounded-[22px]",
          tone === "coral" ? "bg-coral-soft text-coral-text" : "bg-primary-soft text-primary-text",
        )}
      >
        <Icon name={icon} className="size-7" />
      </span>
      {code && (
        <p className="text-primary-text relative mt-5 text-xs font-extrabold tracking-[0.2em] uppercase">
          {code}
        </p>
      )}
      <h1
        id="status-title"
        className={cx(
          "relative text-2xl font-extrabold tracking-[-0.02em]",
          code ? "mt-1" : "mt-5",
        )}
      >
        {title}
      </h1>
      <p className="text-muted relative mx-auto mt-2 max-w-xs text-sm leading-relaxed">{body}</p>
      <div className="relative mt-7 flex flex-wrap justify-center gap-3">{actions}</div>
      {detail && <p className="text-muted relative mt-5 text-xs font-semibold">{detail}</p>}
    </section>
  );
  if (!fullScreen) return <div className="grid place-items-center py-10 md:py-16">{card}</div>;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4 sm:p-6">
      <Logo />
      {card}
    </main>
  );
}
