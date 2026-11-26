import { ApiError, NETWORK_ERROR } from "./errors";

/** Ruta de "MoneyMap no responde" (MM-182). */
export const UNAVAILABLE_PATH = "/unavailable";

/** El encabezado con la ruta pedida, que pone el middleware para volver a ella. */
export const PATH_HEADER = "x-mm-path";

/** Sin respuesta de la API, o el proxy dice que no está (502, 503, 504). */
export function isApiUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === NETWORK_ERROR || [502, 503, 504].includes(error.status))
  );
}

/** A dónde volver con "Reintentar": solo una ruta de esta web, nunca otro sitio. */
export function safeReturn(from: string | null | undefined): string {
  return from?.startsWith("/") && !from.startsWith("//") && !from.startsWith(UNAVAILABLE_PATH)
    ? from
    : "/map";
}

export function unavailableUrl(from: string | null | undefined): string {
  return `${UNAVAILABLE_PATH}?from=${encodeURIComponent(safeReturn(from))}`;
}
