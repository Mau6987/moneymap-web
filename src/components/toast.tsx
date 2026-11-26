"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/** Cuánto queda a la vista un aviso (BUG-061). */
export const TOAST_MS = 4000;

/** Los parámetros con que una pantalla avisa que se guardó algo ("?saved=expense"). */
const NOTICE_PARAMS = ["saved", "changed"];

/**
 * Aviso corto arriba a la derecha ("Link reenviado"), anunciado al lector de
 * pantalla. BUG-061: se va solo a los pocos segundos y sale de la URL, así no
 * vuelve al recargar; si la pantalla avisa otra vez, se vuelve a mostrar.
 */
export function Toast({ children }: { children: ReactNode }) {
  // useSearchParams pide un Suspense para no frenar el prerender de la página.
  return (
    <Suspense fallback={null}>
      <TimedToast>{children}</TimedToast>
    </Suspense>
  );
}

function TimedToast({ children }: { children: ReactNode }) {
  // Null fuera del App Router (tests de un componente suelto).
  const params = useSearchParams() as URLSearchParams | null;
  const notice = NOTICE_PARAMS.map((name) => params?.get(name) ?? "").join("|");
  const [visible, setVisible] = useState(true);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sin aviso en la URL (ya se sacó) no se vuelve a mostrar; al montar, sí.
    if (!first.current && !notice.replaceAll("|", "")) return;
    first.current = false;
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), TOAST_MS);
    const url = new URL(window.location.href);
    if (NOTICE_PARAMS.some((name) => url.searchParams.has(name))) {
      NOTICE_PARAMS.forEach((name) => url.searchParams.delete(name));
      window.history.replaceState(window.history.state, "", url);
    }
  }, [notice]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed top-6 right-6 z-20 rounded-[18px] bg-[#151936] px-[18px] py-3.5 text-sm font-bold text-white shadow-lg max-md:inset-x-4 max-md:top-4"
    >
      {children}
    </div>
  );
}
