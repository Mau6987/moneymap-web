"use client";

import { createContext, useContext, type ReactNode } from "react";

import { catalogs, type Messages } from "./catalog";
import type { Locale } from "./locale";

/** Sin proveedor (en las pruebas), español. */
const LocaleContext = createContext<Locale>("es");

/** Lo pone el layout raíz con el idioma que resolvió el servidor para este pedido. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Los textos del idioma de la página, en un componente del navegador. */
export function useMessages(): Messages {
  return catalogs[useContext(LocaleContext)];
}
