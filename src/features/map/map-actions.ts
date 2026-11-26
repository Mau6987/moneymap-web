"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { REVEAL_COOKIE } from "@/lib/privacy";

/**
 * El ojo del Map con el modo privado (como la app, spec 001 RF-15): muestra
 * los montos hasta cerrar el navegador (cookie de sesión), u otra vez los oculta.
 */
export async function toggleAmounts(form: FormData): Promise<void> {
  const jar = await cookies();
  if (form.get("reveal") === "1") {
    jar.set(REVEAL_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax" });
  } else {
    jar.delete(REVEAL_COOKIE);
  }
  const back = String(form.get("back") ?? "");
  redirect(back.startsWith("/map") ? back : "/map");
}
