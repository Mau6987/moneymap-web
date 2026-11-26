"use server";

import { redirect } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { HOME_PATH } from "@/lib/auth/route-guard";
import { saveSession } from "@/lib/auth/session";

import { applyTheme } from "./apply-theme";
import { authGateway } from "./data/auth-gateway";
import { isValidEmail } from "./domain/email";

export interface LoginState {
  email: string;
  /** El `code` de la API, si el inicio de sesión falló. */
  error?: string;
}

/**
 * Inicia sesión con correo y contraseña y guarda los tokens en cookies
 * `httpOnly` (spec 008, RF-4). El navegador nunca recibe los tokens.
 */
export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  // El botón ya está deshabilitado en este caso (RF-3); esto cubre un envío forzado.
  if (!isValidEmail(email) || password.length === 0) return { email, error: "invalid_credentials" };

  try {
    const tokens = await authGateway().login(email, password);
    await saveSession(tokens);
    await applyTheme(tokens.access_token);
  } catch (error) {
    return { email, error: errorCode(error) };
  }
  redirect(HOME_PATH);
}
