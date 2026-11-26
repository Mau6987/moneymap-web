/**
 * El tema de la web: "Sistema", "Claro" u "Oscuro" (spec 001, RF-13). Se guarda
 * en la API y, para pintarlo antes de que cargue la página, en una cookie que
 * lee el script del layout raíz. No es un dato sensible: la cookie no es
 * `httpOnly` a propósito.
 */
export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "mm_theme";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function parseTheme(value: unknown): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

/** La cookie del tema. "Sistema" se guarda vacía para que siga al sistema. */
export function themeCookie(theme: Theme, secure: boolean) {
  return {
    name: THEME_COOKIE,
    value: theme === "system" ? "" : theme,
    options: {
      httpOnly: false,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: theme === "system" ? 0 : ONE_YEAR_SECONDS,
    },
  };
}

/**
 * Corre en <head> antes de pintar: pone `data-theme` en <html> con el tema de
 * la cookie o, sin ella, con el del sistema, y lo sigue si cambia.
 */
export const themeScript = `(function(){try{var d=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)"),m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m){d.dataset.theme=m[1];return}var s=function(){d.dataset.theme=q.matches?"dark":"light"};s();q.addEventListener("change",s)}catch(e){}})()`;
