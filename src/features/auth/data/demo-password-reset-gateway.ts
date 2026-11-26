import { ApiError, NETWORK_ERROR } from "@/lib/api/errors";

import type { PasswordResetGateway } from "./password-reset-gateway";

/** El código de prueba del modo demo, el mismo de la app (spec 009, Modo demo). */
export const DEMO_RESET_CODE = "123456";

function check(email: string, code: string) {
  if (email === "sinred@demo.com") throw new ApiError(NETWORK_ERROR, 0);
  if (code !== DEMO_RESET_CODE) throw new ApiError("invalid_reset_code", 400);
}

export const demoPasswordResetGateway: PasswordResetGateway = {
  async requestCode(email) {
    if (email === "sinred@demo.com") throw new ApiError(NETWORK_ERROR, 0);
  },
  async verifyCode(email, code) {
    check(email, code);
  },
  async confirm(email, code) {
    check(email, code);
  },
};
