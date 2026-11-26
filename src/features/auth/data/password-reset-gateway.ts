import { apiBaseUrl, createApiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/errors";
import { isDemo } from "@/lib/demo";

import { demoPasswordResetGateway } from "./demo-password-reset-gateway";

/**
 * Restablecer la contraseña con un código de 6 dígitos (spec 008 del backend).
 * La API responde lo mismo exista o no la cuenta. Lanza `ApiError`.
 */
export interface PasswordResetGateway {
  requestCode(email: string): Promise<void>;
  /** Comprueba el código sin gastarlo. */
  verifyCode(email: string, code: string): Promise<void>;
  /** Cambia la contraseña y cierra todas las sesiones. */
  confirm(email: string, code: string, newPassword: string): Promise<void>;
}

const api = () => createApiClient({ baseUrl: apiBaseUrl() });

export const apiPasswordResetGateway: PasswordResetGateway = {
  requestCode: async (email) => {
    await unwrap(api().POST("/v1/auth/password-reset", { body: { email } }));
  },
  verifyCode: async (email, code) => {
    await unwrap(api().POST("/v1/auth/password-reset/verify", { body: { email, code } }));
  },
  confirm: async (email, code, newPassword) => {
    await unwrap(
      api().POST("/v1/auth/password-reset/confirm", {
        body: { email, code, new_password: newPassword },
      }),
    );
  },
};

export function passwordResetGateway(): PasswordResetGateway {
  return isDemo() ? demoPasswordResetGateway : apiPasswordResetGateway;
}
