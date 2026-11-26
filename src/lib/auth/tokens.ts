/**
 * Cookies de la sesión.
 *
 * Los tokens viven solo en cookies `httpOnly`: el JavaScript del navegador nunca
 * los ve (AGENTS.md, Reglas). Este archivo no importa Next.js para poder probarlo
 * y usarlo igual desde el middleware, las server actions y los route handlers.
 */

export const ACCESS_COOKIE = "mm_access";
export const REFRESH_COOKIE = "mm_refresh";

/** El refresh vale 30 días en la API (docs/api.md del backend, Autenticación). */
export const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * El acceso se descarta un poco antes de que venza, para que el middleware lo
 * renueve antes de que la API responda 401 a mitad de una página.
 */
const ACCESS_MARGIN_SECONDS = 30;

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
}

function cookie(name: string, value: string, maxAge: number, secure: boolean): SessionCookie {
  return { name, value, options: { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge } };
}

/** Las dos cookies que guardan un par de tokens. */
export function sessionCookies(tokens: TokenPair, secure: boolean): SessionCookie[] {
  const accessMaxAge = Math.max(tokens.expires_in - ACCESS_MARGIN_SECONDS, 1);
  return [
    cookie(ACCESS_COOKIE, tokens.access_token, accessMaxAge, secure),
    cookie(REFRESH_COOKIE, tokens.refresh_token, REFRESH_MAX_AGE_SECONDS, secure),
  ];
}

/** Las dos cookies vencidas, para borrar la sesión. */
export function clearedCookies(secure: boolean): SessionCookie[] {
  return [cookie(ACCESS_COOKIE, "", 0, secure), cookie(REFRESH_COOKIE, "", 0, secure)];
}

/** En local se sirve por http; en cualquier otro entorno, solo por https. */
export function secureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}
