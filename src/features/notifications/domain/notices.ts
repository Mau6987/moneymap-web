import type { IconName } from "@/components/icon";

import type { InboxItem } from "../data/notifications-gateway";

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * A dónde lleva un aviso según su `data.screen`, o null si la web todavía no
 * tiene esa pantalla (los pagos fijos) o el aviso es de una versión nueva.
 */
export function noticeHref(item: InboxItem): string | null {
  const { data } = item;
  switch (data.screen) {
    case "money_story":
      return /^\d{4}-\d{2}$/.test(text(data.period))
        ? `/money-story?period=${text(data.period)}`
        : "/money-story";
    case "goal":
      return text(data.goal_id)
        ? `/goals?goal=${encodeURIComponent(text(data.goal_id))}`
        : "/goals";
    case "budgets":
      return text(data.budget_id)
        ? `/budgets?budget=${encodeURIComponent(text(data.budget_id))}`
        : "/budgets";
    default:
      return null;
  }
}

/** El ícono de cada tipo de aviso; uno nuevo usa la campana. */
export function noticeIcon(type: string): IconName {
  if (type.startsWith("goal.")) return "goals";
  if (type.startsWith("budget.")) return "reports";
  if (type.startsWith("money_story.")) return "reports";
  if (type.startsWith("security.")) return "lock";
  if (type.startsWith("recurring.")) return "transactions";
  return "bell";
}

/** El id de la fila de un tipo de aviso, para nombrar su interruptor. */
export const noticeDomId = (type: string) => `notice-${type.replace(/\W/g, "-")}`;
