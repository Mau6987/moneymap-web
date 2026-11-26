/**
 * Reglas de presentación del registro (spec 001, RF-2a y RF-3), las mismas de
 * la app. La API tiene la última palabra: esto solo evita envíos que fallarían.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** La versión de los términos que acepta quien se registra hoy; la misma de la app. */
export const CURRENT_TERMS_VERSION = "2026-10";

/** Quita los espacios de los extremos y junta los repetidos ("  Ana   María " → "Ana María"). */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** 0 sin escribir; de 1 (débil) a 4 (muy segura). */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const KINDS = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/];

/**
 * Un punto por 8 caracteres, por 12, por dos tipos de carácter y por tres.
 * "contrasena12" es segura (3 de 4), como en el mockup "Tus datos".
 */
export function passwordStrength(value: string): PasswordStrength {
  if (value.length === 0) return 0;
  const kinds = KINDS.filter((kind) => kind.test(value)).length;
  const points = [
    value.length >= MIN_PASSWORD_LENGTH,
    value.length >= 12,
    kinds >= 2,
    kinds >= 3,
  ].filter(Boolean).length;
  if (value.length < MIN_PASSWORD_LENGTH || points <= 1) return 1;
  return points as PasswordStrength;
}

/** "Confirmar contraseña" coincide; vacía nunca coincide. */
export function passwordsMatch(password: string, confirmation: string): boolean {
  return confirmation.length > 0 && password === confirmation;
}
