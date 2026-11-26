import type { Goal } from "../../map/data/map-gateway";

/** Alta, Media y Baja, que se guardan como 1, 3 y 5 (como la app). */
export const PRIORITIES = [1, 3, 5] as const;
export const DEFAULT_PRIORITY = 3;

/** Una meta con 2 o 4 (creada antes) se muestra en la opción más cercana. */
export function nearestPriority(priority: number): (typeof PRIORITIES)[number] {
  if (priority <= 2) return 1;
  if (priority >= 4) return 5;
  return 3;
}

/** Spec 005, RF-7: la fecha objetivo ya pasó y la meta sigue sin cumplirse. */
export function isLate(goal: Goal, today: string): boolean {
  return goal.status !== "achieved" && !!goal.target_date && goal.target_date < today;
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Lee la fecha objetivo del formulario: vacía es "sin fecha". */
export function parseTargetDate(value: string): string | null | undefined {
  const clean = value.trim();
  if (!clean) return null;
  return isDate(clean) ? clean : undefined;
}
