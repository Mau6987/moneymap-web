import { ApiError, NETWORK_ERROR } from "@/lib/api/errors";
import { DEMO_NEW_USER_TOKEN } from "@/lib/demo";

import type { RegistrationGateway, Verification } from "./registration-gateway";

/**
 * Registro falso para el modo demo (`DEMO=true`). El correo decide qué pasa:
 *
 * - `ocupado@demo.com` da `email_taken`;
 * - `sinred@demo.com` da "Sin conexión";
 * - `pendiente@demo.com` nunca se verifica y `expirado@demo.com` vence;
 * - cualquier otro queda verificado al preguntar.
 *
 * El id de la verificación es el correo: así no hace falta guardar estado.
 */
const LINK_MINUTES = 5;
const RESEND_SECONDS = 60;

function verificationFor(email: string): Verification {
  const now = Date.now();
  const status =
    email === "pendiente@demo.com"
      ? "pending"
      : email === "expirado@demo.com"
        ? "expired"
        : "verified";
  return {
    id: email,
    email,
    status,
    expires_at: new Date(now + LINK_MINUTES * 60_000).toISOString(),
    resend_available_at: new Date(now + RESEND_SECONDS * 1000).toISOString(),
  };
}

export const demoRegistrationGateway: RegistrationGateway = {
  async requestVerification(email) {
    if (email === "sinred@demo.com") throw new ApiError(NETWORK_ERROR, 0);
    if (email === "ocupado@demo.com") throw new ApiError("email_taken", 409);
    return { ...verificationFor(email), status: "pending" };
  },
  async resendVerification(verificationId) {
    return { ...verificationFor(verificationId), status: "pending" };
  },
  async verification(verificationId) {
    return verificationFor(verificationId);
  },
  /** Una cuenta nueva: sigue con el onboarding. */
  async register() {
    return { access_token: DEMO_NEW_USER_TOKEN, refresh_token: "demo-refresh", expires_in: 900 };
  },
};
