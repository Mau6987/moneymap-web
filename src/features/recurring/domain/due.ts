import type { RecurringRule } from "../data/recurring-gateway";

/**
 * Los fijos que ya vencieron (o vencen hoy) en una moneda, el más viejo
 * primero. Son recordatorios: siguen ahí hasta que la persona los paga.
 */
export function dueRules(rules: RecurringRule[], currency: string, today: string): RecurringRule[] {
  return rules
    .filter((r) => r.currency === currency && r.next_due_on <= today)
    .sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
}

/** Una vez por pagar de un fijo. `after` es la fecha que se paga antes; sin ella, esta se puede pagar. */
export interface RuleOccurrence {
  rule: RecurringRule;
  dueOn: string;
  after?: string;
}

/**
 * Cada vez por pagar de cada fijo, la más vieja primero: lo atrasado y lo de
 * este periodo, lo mismo que suma Cuentas por pagar (spec 003 del back, RF-23).
 * Un fijo se paga de una vez en una, así que solo la primera de cada uno se paga.
 */
export function ruleOccurrences(rules: RecurringRule[]): RuleOccurrence[] {
  return rules
    .flatMap((rule) => {
      // Un back sin RF-23 no manda `pending_dates`.
      const dates = rule.pending_dates?.length ? rule.pending_dates : [rule.next_due_on];
      return dates.map((dueOn, i) => ({ rule, dueOn, after: dates[i - 1] }));
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
