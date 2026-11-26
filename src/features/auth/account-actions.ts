"use server";

import { redirect } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { HOME_PATH } from "@/lib/auth/route-guard";
import { clearVerification, saveSession, verificationId } from "@/lib/auth/session";

import { registrationGateway } from "./data/registration-gateway";
import {
  CURRENT_TERMS_VERSION,
  MIN_PASSWORD_LENGTH,
  cleanName,
} from "./domain/register-validation";
import { VERIFICATION_MISSING } from "./domain/verification";

export interface AccountInput {
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * "Crear cuenta": registra con el correo verificado, guarda la sesión en las
 * cookies y abre la app, que sigue con el onboarding (RF-5).
 */
export async function createAccount(input: AccountInput): Promise<{ error: string }> {
  const id = await verificationId();
  if (!id) return { error: VERIFICATION_MISSING };

  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  if (!firstName || !lastName || input.password.length < MIN_PASSWORD_LENGTH) {
    return { error: "validation_error" };
  }

  try {
    const tokens = await registrationGateway().register({
      verification_id: id,
      first_name: firstName,
      last_name: lastName,
      password: input.password,
      terms_version: CURRENT_TERMS_VERSION,
    });
    await saveSession(tokens);
    await clearVerification();
  } catch (error) {
    return { error: errorCode(error) };
  }
  redirect(HOME_PATH);
}
