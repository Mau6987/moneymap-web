"use server";

import { redirect } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { HOME_PATH } from "@/lib/auth/route-guard";
import {
  clearSocialRegistration,
  saveSession,
  saveSocialRegistration,
  socialRegistration,
} from "@/lib/auth/session";

import { applyTheme } from "./apply-theme";
import { googleGateway } from "./data/google-gateway";
import { REGISTRATION_EXPIRED } from "./domain/google";
import { CURRENT_TERMS_VERSION, cleanName } from "./domain/register-validation";

export interface GoogleState {
  error?: string;
}

/**
 * Spec 008, RF-8 a RF-10: el `id_token` de Google va a la API. Con una
 * sesión, entra como con la contraseña (RF-9); si la persona es nueva, abre
 * "Completa tu perfil" (RF-10). El token de registro queda en una cookie
 * `httpOnly`.
 */
export async function signInWithGoogle(idToken: string): Promise<GoogleState> {
  if (!idToken) return { error: "invalid_provider_token" };
  let next: string;
  try {
    const result = await googleGateway().signIn(idToken);
    if (result.kind === "signed_in") {
      await saveSession(result.tokens);
      await applyTheme(result.tokens.access_token);
      next = HOME_PATH;
    } else {
      await saveSocialRegistration({
        token: result.registrationToken,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
      });
      next = "/register/google";
    }
  } catch (error) {
    return { error: errorCode(error) };
  }
  redirect(next);
}

/**
 * "Completa tu perfil" (spec 001, RF-7 y RF-8): nombre, apellido y los
 * términos. Crea la cuenta y abre la app, que sigue con el onboarding.
 */
export async function completeGoogleProfile(
  _previous: GoogleState,
  form: FormData,
): Promise<GoogleState> {
  const registration = await socialRegistration();
  if (!registration) return { error: REGISTRATION_EXPIRED };

  const firstName = cleanName(String(form.get("first_name") ?? ""));
  const lastName = cleanName(String(form.get("last_name") ?? ""));
  if (!firstName || !lastName) return { error: "name_required" };
  if (form.get("terms") !== "on") return { error: "terms_required" };

  try {
    const tokens = await googleGateway().complete({
      registration_token: registration.token,
      first_name: firstName,
      last_name: lastName,
      terms_version: CURRENT_TERMS_VERSION,
      ...(registration.email ? {} : { email: String(form.get("email") ?? "").trim() || null }),
    });
    await saveSession(tokens);
  } catch (error) {
    const code = errorCode(error);
    if (code === "invalid_registration_token") {
      await clearSocialRegistration();
      return { error: REGISTRATION_EXPIRED };
    }
    return { error: code };
  }
  await clearSocialRegistration();
  redirect(HOME_PATH);
}
