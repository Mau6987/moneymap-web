import { ApiError, NETWORK_ERROR } from "@/lib/api/errors";
import { DEMO_NEW_USER_TOKEN } from "@/lib/demo";

import type { AuthGateway, Profile } from "./auth-gateway";

/**
 * Datos falsos para revisar el diseño sin backend (`DEMO=true`), con los mismos
 * correos de prueba que la app (spec 008, Modo demo):
 *
 * - la contraseña `incorrecta` da `invalid_credentials`;
 * - `sinverificar@demo.com` da `email_not_verified`;
 * - `sinred@demo.com` da "Sin conexión";
 * - `nueva@demo.com` entra como una persona que no terminó el onboarding.
 */
export const DEMO_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "ana@demo.com",
  first_name: "Ana",
  last_name: "López",
  display_name: "Ana López",
  avatar_object_key: null,
  country_code: "BO",
  city: null,
  occupation: null,
  locale: "es-BO",
  timezone: "America/La_Paz",
  // MM-190: la persona demo también es la administradora, para ver el panel sin back.
  is_admin: true,
};

const DEMO_TOKENS = { access_token: "demo-access", refresh_token: "demo-refresh", expires_in: 900 };

export const demoAuthGateway: AuthGateway = {
  async login(email, password) {
    if (email === "sinred@demo.com") throw new ApiError(NETWORK_ERROR, 0);
    if (email === "sinverificar@demo.com") throw new ApiError("email_not_verified", 403);
    if (password === "incorrecta") throw new ApiError("invalid_credentials", 401);
    if (email === "nueva@demo.com") return { ...DEMO_TOKENS, access_token: DEMO_NEW_USER_TOKEN };
    return DEMO_TOKENS;
  },
  async refresh() {
    return DEMO_TOKENS;
  },
  async logout() {},
  async me() {
    return DEMO_PROFILE;
  },
};
