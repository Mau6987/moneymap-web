import type { Messages } from "@/lib/i18n/catalog";

import type { AdminChange } from "../data/admin-gateway";

const SHOWN = ["name", "description", "is_public", "is_enabled", "limit_value", "amount"];

function value(v: unknown, t: Messages["admin"]): string {
  if (v === null || v === undefined) return t.unlimited;
  if (v === true) return t.yes;
  if (v === false) return t.no;
  return String(v);
}

/**
 * Una línea por cambio del historial (MM-190): "límite: 2 → 3". En un alta la
 * fila llega entera; se muestran solo los campos que el panel edita.
 */
export function changeSummary(change: AdminChange, t: Messages["admin"]): string {
  const entries = Object.entries(change.changes).filter(([k]) => SHOWN.includes(k));
  return entries
    .map(([k, v]) => {
      const label = t.fields[k] ?? k;
      if (Array.isArray(v) && v.length === 2)
        return `${label}: ${value(v[0], t)} → ${value(v[1], t)}`;
      return `${label}: ${value(v, t)}`;
    })
    .join(" · ");
}
