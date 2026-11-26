"use server";

import { redirect } from "next/navigation";

import { clearSession, refreshToken } from "@/lib/auth/session";

import { authGateway } from "./data/auth-gateway";

/**
 * Cierra la sesión de este navegador: avisa a la API con el refresh y, responda
 * lo que responda (sin conexión también), borra las cookies y abre el inicio de
 * sesión. Igual que la app (spec 008, MM-143).
 */
export async function logout(): Promise<void> {
  const token = await refreshToken();
  if (token) {
    try {
      await authGateway().logout(token);
    } catch {
      // La sesión se cierra igual en el navegador; el refresh vence solo en la API.
    }
  }
  await clearSession();
  redirect("/login");
}
