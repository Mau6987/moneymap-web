/**
 * Modo demo: la web usa datos falsos en lugar de la API para revisar el diseño
 * sin backend, igual que la app con `--dart-define=DEMO=true`. Nunca en producción.
 */
export function isDemo(): boolean {
  return process.env.DEMO === "true";
}

/**
 * El token de acceso demo de una persona nueva (registrada en el demo o que
 * entra con `nueva@demo.com`): con él, el demo muestra el onboarding.
 */
export const DEMO_NEW_USER_TOKEN = "demo-new-access";

/** El `id_token` que manda el botón de Google del modo demo, sin Google de verdad. */
export const DEMO_GOOGLE_TOKEN = "demo-google-id-token";
