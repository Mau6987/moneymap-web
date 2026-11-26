/**
 * Lo que hace que un nombre escrito sea un nombre: al menos una letra o un
 * número, en cualquier alfabeto. "Netflix", "Luz 2", "Café" y "Netflix 🎬"
 * pasan; "-", "..." o un emoji solo, no (BUG-002, BUG-003, BUG-004).
 */
export function hasText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

/**
 * La descripción de un movimiento como se guarda (BUG-050): sin espacios al
 * borde ni repetidos. "  Almuerzo   con Ana " queda "Almuerzo con Ana".
 */
export function cleanDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
