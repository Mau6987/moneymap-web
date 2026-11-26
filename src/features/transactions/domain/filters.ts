import type { Transaction } from "../../map/data/map-gateway";
import type { GoalMovementsQuery, TransactionsQuery } from "../data/transactions-gateway";

/**
 * REQ-056: "transfer" deja solo las transferencias entre cuentas y "goals"
 * muestra los aportes y retiros de las metas (otra lista de la API).
 */
export type KindFilter = "all" | "expense" | "income" | "transfer" | "goals";

const KINDS: KindFilter[] = ["expense", "income", "transfer", "goals"];
/** REQ: "period" y "lastPeriod" son la semana o la quincena de la persona, como la app. */
export type DateFilter = "all" | "month" | "last" | "period" | "lastPeriod" | "range";

/** El periodo financiero de hoy, como lo da Safe to Spend. */
export interface FinancialPeriod {
  kind: "weekly" | "semi_monthly" | "monthly";
  startsOn: string;
  endsOn: string;
}

/** Los filtros de Movimientos, tal como quedan en la URL. */
export interface Filters {
  q: string;
  kind: KindFilter;
  date: DateFilter;
  from: string;
  to: string;
  account: string;
  category: string;
  currency: string;
  cursor: string;
  view?: string;
}

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Lee los filtros de la URL; lo que no se entiende se ignora. */
export function parseFilters(params: Params): Filters {
  const kind = one(params.kind);
  const date = one(params.date);
  return {
    q: one(params.q).slice(0, 200),
    kind: KINDS.find((k) => k === kind) ?? "all",
    date: DATES.find((d) => d === date) ?? "all",
    from: isDate(one(params.from)) ? one(params.from) : "",
    to: isDate(one(params.to)) ? one(params.to) : "",
    account: one(params.account),
    category: one(params.category),
    currency: one(params.currency),
    cursor: one(params.cursor),
    view: one(params.view) === "two-column" ? "two-column" : "",
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** El primer y el último día del mes de `today` corrido `offset` meses. */
export function monthRange(today: string, offset = 0): [string, string] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(Date.UTC(y, m + offset, 0));
  return [
    iso(first.getUTCFullYear(), first.getUTCMonth(), 1),
    iso(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()),
  ];
}

const DATES: DateFilter[] = ["month", "last", "period", "lastPeriod", "range"];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Semanal, quincenal o mensual, por cuántos días tiene el periodo. */
export function periodKind(startsOn: string, endsOn: string): FinancialPeriod["kind"] {
  const days = Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000) + 1;
  return days <= 7 ? "weekly" : days <= 16 ? "semi_monthly" : "monthly";
}

/** El periodo de hoy y el anterior, del mismo largo (la quincena anterior, la semana pasada). */
export function periodRanges(period: FinancialPeriod): {
  current: [string, string];
  previous: [string, string];
} {
  const current: [string, string] = [period.startsOn, period.endsOn];
  if (period.kind === "weekly") {
    return { current, previous: [addDays(period.startsOn, -7), addDays(period.startsOn, -1)] };
  }
  if (period.kind === "semi_monthly") {
    const day = Number(period.startsOn.slice(8, 10));
    const end = addDays(period.startsOn, -1);
    // La primera mitad empieza el 1; la segunda, el 16 del mes anterior.
    const start = day === 1 ? `${end.slice(0, 8)}16` : `${period.startsOn.slice(0, 8)}01`;
    return { current, previous: [start, end] };
  }
  const end = addDays(period.startsOn, -1);
  return { current, previous: [`${end.slice(0, 8)}01`, end] };
}

/** Lo que va a `GET /v1/transactions`. El tipo se filtra sobre lo que llega. */
export function toQuery(
  filters: Filters,
  today: string,
  period?: FinancialPeriod | null,
): TransactionsQuery {
  const periods = period ? periodRanges(period) : null;
  const [from, to] =
    filters.date === "month"
      ? monthRange(today)
      : filters.date === "last"
        ? monthRange(today, -1)
        : filters.date === "period" && periods
          ? periods.current
          : filters.date === "lastPeriod" && periods
            ? periods.previous
            : filters.date === "range"
              ? [filters.from, filters.to]
              : ["", ""];
  const query: TransactionsQuery = { limit: 50 };
  if (from) query.from = from;
  if (to) query.to = to;
  if (filters.q) query.q = filters.q;
  if (filters.account) query.account_id = filters.account;
  if (filters.category) query.category_id = filters.category;
  if (filters.currency) query.currency = filters.currency;
  if (filters.cursor) query.cursor = filters.cursor;
  return query;
}

/**
 * Gastos o ingresos sobre lo cargado. Con una cuenta elegida, una
 * transferencia que llega a ella cuenta como dinero que entra (spec 002).
 */
export function byKind(items: Transaction[], kind: KindFilter, account: string): Transaction[] {
  if (kind === "all") return items;
  if (kind === "transfer") return items.filter((t) => t.kind === "transfer");
  if (kind === "goals") return [];
  return items.filter((t) => directionOf(t, account) === (kind === "income" ? "in" : "out"));
}

/** Si el movimiento suma o resta, mirado desde `account` (o desde todas). */
export function directionOf(t: Transaction, account: string): "in" | "out" | "move" {
  if (t.kind === "income") return "in";
  if (t.kind === "expense") return "out";
  if (account && t.transfer_account_id === account) return "in";
  if (account && t.account_id === account) return "out";
  return "move";
}

/** La URL de Movimientos con estos filtros y los cambios pedidos. */
export function filtersHref(filters: Filters, changes: Partial<Filters> = {}): string {
  const merged = { ...filters, cursor: "", ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value && value !== "all") params.set(key, value);
  }
  const text = params.toString();
  return text ? `/transactions?${text}` : "/transactions";
}

/** Cuántos filtros, fuera de la búsqueda y el tipo, están puestos. */
export function activeCount(filters: Filters): number {
  return [filters.date !== "all", !!filters.account, !!filters.category, !!filters.currency].filter(
    Boolean,
  ).length;
}

/** REQ-056: los filtros de `GET /v1/goals/movements` (sin búsqueda ni categoría). */
export function toGoalMovementsQuery(
  filters: Filters,
  today: string,
  period?: FinancialPeriod | null,
): GoalMovementsQuery {
  const query: GoalMovementsQuery & { q?: string; category_id?: string } = toQuery(
    filters,
    today,
    period,
  );
  delete query.q;
  delete query.category_id;
  return query;
}
