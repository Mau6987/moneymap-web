/**
 * La sesión del lado del servidor: lee y escribe las cookies `httpOnly`.
 * Solo se importa desde server actions, route handlers y server components.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { PATH_HEADER, isApiUnavailable, unavailableUrl } from "@/lib/api/unavailable";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedCookies,
  secureCookies,
  sessionCookies,
  type TokenPair,
} from "./tokens";

/** Adónde va quien pierde la sesión: borra las cookies y abre el inicio de sesión. */
export const SESSION_EXPIRED_PATH = "/session/expired";

export async function saveSession(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  for (const { name, value, options } of sessionCookies(tokens, secureCookies())) {
    store.set(name, value, options);
  }
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const { name, value, options } of clearedCookies(secureCookies())) {
    store.set(name, value, options);
  }
}

/**
 * El id de la verificación del correo, entre "Enviar link" y "Crear cuenta".
 * Va en una cookie `httpOnly` y no en la URL: con él se completa el registro.
 */
const VERIFICATION_COOKIE = "mm_verification";
/** La API acepta la verificación durante 30 minutos para terminar el registro. */
const VERIFICATION_MAX_AGE_SECONDS = 30 * 60;

export async function saveVerification(verificationId: string): Promise<void> {
  (await cookies()).set(VERIFICATION_COOKIE, verificationId, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: VERIFICATION_MAX_AGE_SECONDS,
  });
}

export async function verificationId(): Promise<string | undefined> {
  return (await cookies()).get(VERIFICATION_COOKIE)?.value;
}

export async function clearVerification(): Promise<void> {
  (await cookies()).delete(VERIFICATION_COOKIE);
}

/**
 * Una persona nueva que entró con Google, entre Google y "Completa tu perfil"
 * (spec 008, RF-10): el token de registro de la API y lo que Google sabe de
 * ella. En una cookie `httpOnly`: el token no pasa por la URL ni por el
 * navegador.
 */
export interface SocialRegistration {
  token: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

const SOCIAL_COOKIE = "mm_social_registration";
/** El token de registro de la API vence a los 15 minutos. */
const SOCIAL_MAX_AGE_SECONDS = 15 * 60;

export async function saveSocialRegistration(registration: SocialRegistration): Promise<void> {
  (await cookies()).set(SOCIAL_COOKIE, JSON.stringify(registration), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SOCIAL_MAX_AGE_SECONDS,
  });
}

export async function socialRegistration(): Promise<SocialRegistration | undefined> {
  const raw = (await cookies()).get(SOCIAL_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<SocialRegistration>;
    if (typeof value.token !== "string" || !value.token) return undefined;
    return {
      token: value.token,
      email: value.email ?? null,
      firstName: value.firstName ?? null,
      lastName: value.lastName ?? null,
    };
  } catch {
    return undefined;
  }
}

export async function clearSocialRegistration(): Promise<void> {
  (await cookies()).delete(SOCIAL_COOKIE);
}

export async function refreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/**
 * Corre una llamada autenticada con el token de acceso de la cookie. Si no hay
 * token o la API responde 401, la sesión terminó (spec 008, RF-20).
 */
export async function withAccessToken<T>(call: (accessToken: string) => Promise<T>): Promise<T> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) redirect(SESSION_EXPIRED_PATH);

  try {
    return await call(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(SESSION_EXPIRED_PATH);
    // MM-182: sin la API no hay pantalla que mostrar; "Reintentar" vuelve acá.
    if (isApiUnavailable(error)) redirect(unavailableUrl((await headers()).get(PATH_HEADER)));
    throw error;
  }
}
