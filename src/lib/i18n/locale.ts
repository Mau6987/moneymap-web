/**
 * Los idiomas de la web (spec 001, RF-19; MM-172), los mismos de la app:
 * español (el base), inglés y portugués. Los montos siguen en es-BO en todos
 * (constitución §2); cambian los textos y las fechas.
 */
export const LOCALES = ["es", "en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Los idiomas que se ofrecen hoy. BUG-018: por ahora la web va solo en
 * español; los textos en inglés y portugués siguen al día para volver a
 * ofrecerlos agregándolos acá.
 */
export const ENABLED_LOCALES: readonly Locale[] = ["es"];

/** "system" sigue al navegador; si no, un idioma. Lo guarda la cookie `mm_lang`. */
export type LanguageChoice = Locale | "system";
export const LANGUAGE_COOKIE = "mm_lang";

export const isLocale = (value: unknown): value is Locale => LOCALES.some((l) => l === value);

/** Las opciones de Ajustes: "Sistema" solo tiene sentido con más de un idioma. */
export function languageChoices(
  enabled: readonly Locale[] = ENABLED_LOCALES,
): readonly LanguageChoice[] {
  return enabled.length > 1 ? ["system", ...enabled] : enabled;
}

/** Lo que va en `<html lang>` y en `Intl`: es-BO, en-US o pt-BR. */
export const LOCALE_TAGS: Record<Locale, string> = { es: "es-BO", en: "en-US", pt: "pt-BR" };

/**
 * El idioma de un pedido: el que eligió la persona y, con "Sistema" o sin
 * cookie, el primero de `Accept-Language` que ofrecemos. Si el navegador
 * habla otro, o la cookie guarda uno que ya no se ofrece, español.
 */
export function resolveLocale(
  choice: string | null | undefined,
  acceptLanguage?: string | null,
  enabled: readonly Locale[] = ENABLED_LOCALES,
): Locale {
  const offered = (value: unknown): value is Locale => enabled.some((l) => l === value);
  if (offered(choice)) return choice;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().split(";")[0]?.slice(0, 2).toLowerCase();
    if (offered(code)) return code;
  }
  return "es";
}

/** Un texto por idioma, con el mismo tipo que el español. */
export function byLocale<T>(dictionaries: { es: T; en: T; pt: T }): Record<Locale, T> {
  return dictionaries;
}
