"use server";

import { accentOf } from "./domain/accents";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import { errorCode } from "@/lib/api/errors";
import { clearSession, withAccessToken } from "@/lib/auth/session";
import { ENABLED_LOCALES, LANGUAGE_COOKIE } from "@/lib/i18n/locale";
import { parseAmount } from "@/lib/money/parse";
import { parseTheme } from "@/lib/theme";
import { saveTheme } from "@/lib/theme-cookie";

import { settingsGateway, type ProfileChange } from "./data/settings-gateway";

export interface SettingsFormState {
  error?: string;
}

const OCCUPATIONS = [
  "student",
  "employee",
  "self_employed",
  "entrepreneur",
  "unemployed",
  "retired",
  "other",
] as const;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Corre el cambio y devuelve el `code` del error, o nada si salió bien. */
async function attempt(change: (token: string) => Promise<unknown>): Promise<string | undefined> {
  try {
    await withAccessToken(change);
  } catch (error) {
    unstable_rethrow(error);
    return errorCode(error);
  }
  return undefined;
}

/** RF-11: nombre, apellido, cómo llamarlo, ciudad y ocupación; el correo no se toca. */
export async function saveProfile(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const firstName = text(form, "first_name");
  const lastName = text(form, "last_name");
  if (!firstName || !lastName) return { error: "name_required" };
  if (firstName.length > 80 || lastName.length > 80) return { error: "validation_error" };

  const occupation = text(form, "occupation");
  const change: ProfileChange = {
    first_name: firstName,
    last_name: lastName,
    // Vacío vuelve a ser el nombre (lo resuelve la API).
    display_name: text(form, "display_name") || null,
    city: text(form, "city") || null,
    occupation: OCCUPATIONS.find((o) => o === occupation) ?? null,
  };
  const error = await attempt((token) => settingsGateway().updateProfile(token, change));
  if (error) return { error };
  redirect("/settings?saved=profile");
}

/**
 * RF-13, RF-15 y RF-16: el tema, abrir con los montos ocultos o el inicio de
 * semana; solo lo que trae el formulario. El tema también va a la cookie que
 * lo pinta antes de cargar.
 */
export async function savePreferences(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const section = text(form, "section") === "security" ? "security" : "profile";
  const theme = form.has("theme") ? parseTheme(text(form, "theme")) : undefined;
  const week = form.has("week_starts_on") ? Number(text(form, "week_starts_on")) : undefined;
  const hide = form.has("hide_amounts") ? text(form, "hide_amounts") === "true" : undefined;
  // Como la app: el color de acento, solo de la lista.
  const accent = form.has("accent_color") ? accentOf(text(form, "accent_color")) : undefined;
  if (week !== undefined && week !== 0 && week !== 1) return { error: "validation_error" };

  const error = await attempt((token) =>
    settingsGateway().updatePreferences(token, {
      ...(theme ? { theme } : {}),
      ...(week !== undefined ? { week_starts_on: week } : {}),
      ...(hide !== undefined ? { hide_amounts: hide } : {}),
      ...(accent ? { accent_color: accent } : {}),
    }),
  );
  if (error) return { error };
  if (theme) await saveTheme(theme);
  redirect(`/settings?s=${section}&saved=preferences`);
}

/**
 * Spec 001, RF-19 (MM-172): el idioma se guarda en este navegador, no en la
 * API, como en la app. "system" borra la cookie y vuelve a seguir al navegador.
 */
export async function saveLanguage(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const choice = text(form, "language");
  const jar = await cookies();
  if (ENABLED_LOCALES.some((l) => l === choice)) {
    jar.set(LANGUAGE_COOKIE, choice, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else if (choice === "system" && ENABLED_LOCALES.length > 1) {
    jar.delete(LANGUAGE_COOKIE);
  } else {
    return { error: "validation_error" };
  }
  redirect("/settings?saved=preferences");
}

/** Spec 002, RF-13: la moneda principal sale de Mis monedas; los montos no cambian. */
export async function saveMainCurrency(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const code = text(form, "main_currency");
  if (!/^[A-Z]{3}$/.test(code)) return { error: "validation_error" };
  const error = await attempt((token) =>
    settingsGateway().updateMoney(token, { main_currency: code }),
  );
  if (error) return { error };
  redirect("/settings?saved=money");
}

/** El ahorro planificado, en la moneda principal y con sus decimales; puede ser cero. */
export async function saveSavings(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const decimals = Number(text(form, "decimals") || 2);
  const amount = parseAmount(text(form, "planned_savings") || "0", { decimals, allowZero: true });
  if (!amount) return { error: "invalid_amount" };
  const error = await attempt((token) =>
    settingsGateway().updateMoney(token, { planned_savings: amount }),
  );
  if (error) return { error };
  // Como la app: también se edita desde Safe to Spend, y ahí se vuelve.
  if (text(form, "back") === "/safe-to-spend") redirect("/safe-to-spend?saved=savings");
  redirect("/settings?saved=money");
}

/** Spec 002, RF-14: suma una moneda del catálogo a Mis monedas. */
export async function addCurrency(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const code = text(form, "code");
  if (!/^[A-Z]{3}$/.test(code)) return { error: "validation_error" };
  const error = await attempt((token) => settingsGateway().addCurrency(token, code));
  if (error) return { error };
  redirect("/settings?saved=added");
}

/** RF-14: la principal o una con cuentas activas no se quita (409 `currency_in_use`). */
export async function removeCurrency(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const code = text(form, "code");
  if (!/^[A-Z]{3}$/.test(code)) return { error: "validation_error" };
  const error = await attempt((token) => settingsGateway().removeCurrency(token, code));
  if (error) return { error };
  redirect("/settings?saved=removed");
}

/**
 * "Eliminar cuenta" (spec 001 del back, RF-28 a RF-31): con la contraseña. La
 * cuenta se borra en 30 días; la API cierra todas las sesiones y aquí se
 * borran las cookies.
 */
export async function deleteAccount(
  _previous: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { error: "password_required" };
  const error = await attempt((token) => settingsGateway().requestDeletion(token, password));
  if (error) return { error };
  await clearSession();
  redirect("/login");
}
