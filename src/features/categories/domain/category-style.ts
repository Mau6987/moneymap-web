import { CATEGORY_ICONS } from "@/components/category-icon";

/** Los colores que se ofrecen para una categoría: los mismos de la app. */
export const CATEGORY_COLORS = [
  "#3E4BD2",
  "#7C3AED",
  "#2E8A62",
  "#0E7C86",
  "#D25A42",
  "#E2A93C",
  "#6B7280",
] as const;

/** El ícono de una categoría nueva si no se eligió otro. */
export function defaultIcon(type: "income" | "expense"): string {
  return type === "income" ? "payments" : "shopping_bag";
}

/** Solo los íconos que dibujan la web y la app. */
export function isCategoryIcon(value: string): boolean {
  return CATEGORY_ICONS.includes(value);
}

export function isCategoryColor(value: string): boolean {
  return (CATEGORY_COLORS as readonly string[]).includes(value.toUpperCase());
}

/** Blanco o tinta oscura sobre el color de la categoría, el que contraste más. */
export function inkOn(hex: string): string {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contraste con blanco (1) contra contraste con #151936 (≈0,012).
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.062 ? "#FFFFFF" : "#151936";
}
