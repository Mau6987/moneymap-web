"use client";

import { useEffect } from "react";

import type { Theme } from "@/lib/theme";

/**
 * Aplica el tema guardado sin recargar: después de cambiarlo en Ajustes la
 * página vuelve por navegación del cliente y el script de <head> no corre otra
 * vez. Con "Sistema" sigue al sistema mientras la página esté abierta.
 */
export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== "system") {
      root.dataset.theme = theme;
      return;
    }
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme = query.matches ? "dark" : "light";
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
