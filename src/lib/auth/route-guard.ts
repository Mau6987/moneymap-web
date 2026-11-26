/**
 * El inicio de la app. Se redirige directo acá, no a "/": la raíz es una página
 * estática que redirige, y en producción una acción que manda a "/" no navega.
 */
export const HOME_PATH = "/map";

/** Rutas que se abren sin sesión. Con sesión, mandan al inicio. */
const GUEST_PATHS = ["/login", "/register", "/forgot-password"];

/**
 * Rutas que nunca se redirigen: cierran la sesión, reciben links de correo o
 * son la página "Sin conexión" que guarda el service worker de la PWA.
 */
const OPEN_PATHS = ["/session", "/verify-email", "/offline", "/unavailable"];

export type GuardDecision = "continue" | "to-login" | "to-home" | "refresh";

function matches(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isGuestPath(pathname: string): boolean {
  return matches(pathname, GUEST_PATHS);
}

/**
 * Qué hace el middleware con una petición, según la ruta y las cookies.
 * Sin token de acceso pero con refresh, primero se renueva (spec 008, RF-19).
 */
export function guard(pathname: string, hasAccess: boolean, hasRefresh: boolean): GuardDecision {
  if (matches(pathname, OPEN_PATHS)) return "continue";
  if (!hasAccess && hasRefresh) return "refresh";

  const guest = isGuestPath(pathname);
  if (hasAccess) return guest ? "to-home" : "continue";
  return guest ? "continue" : "to-login";
}
