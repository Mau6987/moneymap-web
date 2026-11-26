/** Cuántas categorías muestra Quick Add antes de "Más" (MM-176). */
export const TOP_CATEGORIES = 4;

/**
 * Las categorías ordenadas por cuántas veces se usaron en `recent`; las que
 * empatan (o nunca se usaron) quedan en el orden de la API. Así las de todos
 * los días aparecen primero sin esconder ninguna.
 */
export function byUse<C extends { id: string }>(
  categories: readonly C[],
  recent: readonly { category_id: string | null }[],
): C[] {
  const uses = new Map<string, number>();
  for (const t of recent) {
    if (t.category_id) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1);
  }
  return categories
    .map((c, index) => ({ c, index, count: uses.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ c }) => c);
}

/**
 * Las que se ven sin abrir "Más": las primeras `TOP_CATEGORIES` y, si la
 * elegida está más abajo, también ella, para que siempre se vea marcada.
 */
export function visibleCategories<C extends { id: string }>(
  ordered: readonly C[],
  selectedId: string,
  expanded: boolean,
): C[] {
  if (expanded) return [...ordered];
  const top = ordered.slice(0, TOP_CATEGORIES);
  const selected = ordered.find((c) => c.id === selectedId);
  return selected && !top.includes(selected) ? [...top, selected] : top;
}
