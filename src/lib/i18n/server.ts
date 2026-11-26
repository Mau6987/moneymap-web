// Solo en el servidor: `next/headers` no se puede importar desde el navegador.
import { cookies, headers } from "next/headers";
import { cache, use } from "react";

import { catalogs, type Messages } from "./catalog";
import {
  LANGUAGE_COOKIE,
  languageChoices,
  resolveLocale,
  type LanguageChoice,
  type Locale,
} from "./locale";

/**
 * Lo que eligió la persona en Ajustes: un idioma o "system" (sin cookie, también).
 * Un idioma que ya no se ofrece cuenta como la primera opción (BUG-018).
 */
export const getLanguageChoice = cache(async (): Promise<LanguageChoice> => {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  const choices = languageChoices();
  return choices.find((c) => c === value) ?? choices[0] ?? "es";
});

/** El idioma de este pedido: la cookie `mm_lang` o, con "Sistema", `Accept-Language`. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [choice, accept] = await Promise.all([
    getLanguageChoice(),
    headers().then((h) => h.get("accept-language")),
  ]);
  return resolveLocale(choice, accept);
});

/** Los textos de este pedido, para las páginas y los componentes del servidor. */
export const getMessages = cache(async (): Promise<Messages> => catalogs[await getLocale()]);

/** Lo mismo en un componente del servidor que no es `async`. */
export function useServerMessages(): Messages {
  return use(getMessages());
}

/**
 * El idioma para traducir lo que llega de la API (MM-191). Fuera de un pedido
 * (un test, un script) no hay cookies: español, como la API.
 */
export async function apiTextLocale(): Promise<Locale> {
  try {
    return await getLocale();
  } catch {
    return "es";
  }
}
