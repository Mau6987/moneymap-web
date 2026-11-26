import { saveTheme } from "@/lib/theme-cookie";

import { settingsGateway } from "../settings/data/settings-gateway";

/**
 * Spec 001, RF-17: el tema elegido en otro dispositivo, en la cookie que lo
 * pinta. Si la API no responde, la web sigue al sistema; nunca frena la
 * entrada. No es una server action: se llama solo desde el servidor.
 */
export async function applyTheme(accessToken: string): Promise<void> {
  try {
    await saveTheme((await settingsGateway().preferences(accessToken)).theme);
  } catch {
    // Sin preferencias, el tema del sistema.
  }
}
