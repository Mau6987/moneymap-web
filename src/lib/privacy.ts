// Solo en el servidor: lee la cookie del pedido.
import { cookies } from "next/headers";

/** Cookie de sesión: el ojo del Map mostró los montos hasta cerrar el navegador. */
export const REVEAL_COOKIE = "mm_reveal";

/**
 * Si los montos van ocultos: el modo privado de Ajustes, salvo que el ojo del
 * Map los haya mostrado en esta sesión (como la app, spec 001 RF-15). Fuera
 * de un pedido (un test) solo cuenta el modo privado.
 */
export async function amountsHidden(
  preferences: { hide_amounts?: boolean } | null | undefined,
): Promise<boolean> {
  if (!preferences?.hide_amounts) return false;
  try {
    return (await cookies()).get(REVEAL_COOKIE)?.value !== "1";
  } catch {
    return true;
  }
}
