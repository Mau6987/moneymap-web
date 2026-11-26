import type { TokenPair } from "./tokens";

export type RefreshTokens = (refreshToken: string) => Promise<TokenPair>;

/**
 * Cuánto se recuerda el par nuevo de un refresh ya rotado. Cubre las peticiones
 * que el navegador manda juntas con la misma cookie vieja.
 */
const REMEMBER_MS = 10_000;

interface Entry {
  promise: Promise<TokenPair>;
  expiresAt: number;
}

/**
 * Renueva la sesión una sola vez aunque lleguen varias peticiones con el mismo
 * refresh token (spec 008, RF-19).
 *
 * El refresh es de un solo uso: si dos peticiones lo mandaran a la API, la
 * segunda contaría como reuso y la API cortaría toda la cadena del dispositivo.
 */
export function createRefresher(refresh: RefreshTokens, now: () => number = Date.now) {
  const inFlight = new Map<string, Entry>();

  return function refreshOnce(refreshToken: string): Promise<TokenPair> {
    const time = now();
    for (const [token, entry] of inFlight) {
      if (entry.expiresAt <= time) inFlight.delete(token);
    }

    const existing = inFlight.get(refreshToken);
    if (existing) return existing.promise;

    const promise = refresh(refreshToken);
    inFlight.set(refreshToken, { promise, expiresAt: time + REMEMBER_MS });
    // Un fallo no se recuerda: la próxima petición vuelve a intentar.
    promise.catch(() => inFlight.delete(refreshToken));
    return promise;
  };
}
