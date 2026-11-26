"use server";

import { errorCode } from "@/lib/api/errors";

import { passwordResetGateway } from "./data/password-reset-gateway";
import { isValidEmail } from "./domain/email";
import { MIN_PASSWORD_LENGTH } from "./domain/register-validation";
import { RESET_CODE_PATTERN } from "./domain/reset-code";

/** El resultado de cada paso: nada si salió bien, o el `code` de la API. */
export interface ResetResult {
  error?: string;
}

async function attempt(call: () => Promise<void>): Promise<ResetResult> {
  try {
    await call();
    return {};
  } catch (error) {
    return { error: errorCode(error) };
  }
}

/** "Enviar código" y "Reenviar código" (spec 009, RF-2 y RF-4). */
export async function requestResetCode(email: string): Promise<ResetResult> {
  const clean = email.trim();
  if (!isValidEmail(clean)) return { error: "validation_error" };
  return attempt(() => passwordResetGateway().requestCode(clean));
}

/** "Verificar código": pregunta si el código sirve, sin gastarlo (RF-5). */
export async function verifyResetCode(email: string, code: string): Promise<ResetResult> {
  if (!RESET_CODE_PATTERN.test(code)) return { error: "invalid_reset_code" };
  return attempt(() => passwordResetGateway().verifyCode(email.trim(), code));
}

/** "Guardar contraseña": cambia la contraseña con el código (RF-6). */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<ResetResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { error: "validation_error" };
  return attempt(() => passwordResetGateway().confirm(email.trim(), code, newPassword));
}
