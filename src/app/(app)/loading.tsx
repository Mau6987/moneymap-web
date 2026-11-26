import { useServerMessages } from "@/lib/i18n/server";

/** Un bloque gris del esqueleto; quieto si la persona pidió menos movimiento. */
function Bone({ className }: { className: string }) {
  return <span className={`block rounded-full bg-[var(--mm-well)] ${className}`} />;
}

/**
 * Lo que se ve al cambiar de pantalla mientras llegan los datos: el menú queda
 * y el contenido es un esqueleto de vidrio, al instante. También deja que
 * Next.js adelante la pantalla al pasar por un link.
 */
export default function Loading() {
  const t = useServerMessages().common;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="screen-loading"
      className="flex flex-col gap-4"
    >
      <span className="sr-only">{t.loading}</span>
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-8 w-56 max-w-full" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="glass flex items-center gap-5 rounded-[26px] p-4 sm:px-[22px] sm:py-5">
            <span className="size-[148px] shrink-0 rounded-full border-[12px] border-[var(--mm-well)]" />
            <div className="flex flex-1 flex-col gap-3">
              <Bone className="h-4 w-32" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-28" />
            </div>
          </div>
          <div className="glass flex flex-col gap-3 rounded-[26px] p-4 sm:px-[22px] sm:py-5">
            <Bone className="h-4 w-24" />
            <Bone className="h-7 w-36" />
            <Bone className="h-3 w-full" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="glass flex flex-col gap-3 rounded-[26px] p-4 sm:px-[22px] sm:py-5"
            >
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-4/5" />
              <Bone className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
