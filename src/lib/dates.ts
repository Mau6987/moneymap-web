/**
 * Fechas de la API (`AAAA-MM-DD`) en el idioma de la página (es-BO, en-US o
 * pt-BR; MM-172). Se leen como fechas de calendario, sin zona horaria, para
 * que "2026-10-31" sea el 31 en cualquier lugar.
 */
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/locale";

const asCalendar = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

const formats = new Map<string, Intl.DateTimeFormat>();
const format = (locale: Locale, options: Intl.DateTimeFormatOptions) => {
  const key = `${locale}:${JSON.stringify(options)}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { ...options, timeZone: "UTC" });
    formats.set(key, f);
  }
  return f;
};

/** "13 nov" (en: "Nov 13") */
export function shortDate(iso: string, locale: Locale = "es"): string {
  return format(locale, { day: "numeric", month: "short" })
    .format(asCalendar(iso))
    .replace(".", "");
}

/** "13 de noviembre de 2026" (en: "November 13, 2026") */
export function longDate(iso: string, locale: Locale = "es"): string {
  return format(locale, { day: "numeric", month: "long", year: "numeric" }).format(asCalendar(iso));
}

/** "Octubre" */
export function monthName(iso: string, locale: Locale = "es"): string {
  const name = format(locale, { month: "long" }).format(asCalendar(iso));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "octubre de 2026" o, corto, "oct 2026" (Can I Afford It? y What If?). */
export function monthYear(iso: string, locale: Locale = "es", short = false): string {
  return format(locale, { month: short ? "short" : "long", year: "numeric" }).format(
    asCalendar(iso),
  );
}

/** "Lunes, 26 de octubre": el encabezado de un día en una lista. */
export function weekdayDate(iso: string, locale: Locale = "es"): string {
  const text = format(locale, { weekday: "long", day: "numeric", month: "long" }).format(
    asCalendar(iso),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}
