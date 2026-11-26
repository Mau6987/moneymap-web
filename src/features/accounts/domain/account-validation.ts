/** Un nombre con al menos una letra o número y hasta 80 caracteres (spec 002). */
export function validateName(name: string): string | undefined {
  const clean = name.trim();
  if (!/[\p{L}\p{N}]/u.test(clean)) return "name_required";
  if (clean.length > 80) return "validation_error";
  return undefined;
}
