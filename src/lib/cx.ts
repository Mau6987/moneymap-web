/**
 * Une clases de CSS y descarta las vacías.
 *
 * Existe porque el plugin de Tailwind de Prettier recorta los espacios de los
 * extremos de cada texto: concatenar "a " + "b" termina en "ab".
 */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
