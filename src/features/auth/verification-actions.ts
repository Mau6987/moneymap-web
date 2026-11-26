"use server";

import { errorCode } from "@/lib/api/errors";
import { saveVerification, verificationId } from "@/lib/auth/session";

import { registrationGateway, type Verification } from "./data/registration-gateway";
import { isValidEmail } from "./domain/email";
import { VERIFICATION_MISSING } from "./domain/verification";

/** Lo que la pantalla necesita de la verificación; el id queda en la cookie. */
export interface LinkState {
  email: string;
  status: Verification["status"];
  expiresAt: string;
  resendAvailableAt: string;
}

export type LinkResult =
  { link: LinkState; error?: undefined } | { error: string; link?: undefined };

function toLink(verification: Verification): LinkState {
  return {
    email: verification.email,
    status: verification.status,
    expiresAt: verification.expires_at,
    resendAvailableAt: verification.resend_available_at,
  };
}

async function withVerification(call: (id: string) => Promise<Verification>): Promise<LinkResult> {
  const id = await verificationId();
  if (!id) return { error: VERIFICATION_MISSING };
  try {
    return { link: toLink(await call(id)) };
  } catch (error) {
    return { error: errorCode(error) };
  }
}

/** "Enviar link": pide el link de verificación (spec 001, RF-2). */
export async function requestLink(email: string): Promise<LinkResult> {
  const clean = email.trim();
  if (!isValidEmail(clean)) return { error: "validation_error" };
  try {
    const verification = await registrationGateway().requestVerification(clean);
    await saveVerification(verification.id);
    return { link: toLink(verification) };
  } catch (error) {
    return { error: errorCode(error) };
  }
}

/** "Reenviar link" (RF-2c). */
export async function resendLink(): Promise<LinkResult> {
  return withVerification((id) => registrationGateway().resendVerification(id));
}

/** "Ya verifiqué": pregunta cómo va la verificación (RF-2d y RF-2e). */
export async function checkLink(): Promise<LinkResult> {
  return withVerification((id) => registrationGateway().verification(id));
}
