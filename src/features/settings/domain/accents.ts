/** Los colores de acento, los mismos de la app; el primero es el de la marca. */
export const ACCENTS = ["#3E4BD2", "#7C3AED", "#2E8A62", "#0E7C86", "#D25A42", "#E2A93C"] as const;

export const BRAND_ACCENT = ACCENTS[0];

/** Solo los de la lista: cualquier otro valor vuelve al de la marca. */
export function accentOf(value: string | null | undefined): string {
  const upper = (value ?? "").toUpperCase();
  return ACCENTS.find((a) => a === upper) ?? BRAND_ACCENT;
}

/**
 * Las variables del tema para un acento. El texto en el color del acento se
 * oscurece en claro y se aclara en oscuro para no perder contraste.
 */
export function accentStyle(accent: string): string {
  if (accent === BRAND_ACCENT) return "";
  return [
    `:root{--mm-primary:${accent};--mm-primary-text:color-mix(in srgb,${accent} 78%,black);`,
    `--mm-primary-soft:color-mix(in srgb,${accent} 12%,transparent)}`,
    `:root[data-theme="dark"]{--mm-primary-text:color-mix(in srgb,${accent} 55%,white);`,
    `--mm-primary-soft:color-mix(in srgb,${accent} 20%,transparent)}`,
  ].join("");
}
