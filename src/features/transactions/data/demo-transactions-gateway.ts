import { ApiError } from "@/lib/api/errors";

import type { Transaction } from "../../map/data/map-gateway";
import type {
  Account,
  GoalMovement,
  Receipt,
  TransactionsGateway,
  TransactionsQuery,
} from "./transactions-gateway";

/**
 * El historial falso de `DEMO=true`: unos 30 movimientos de los últimos dos
 * meses en Bs y USD, con los mismos filtros que la API.
 */
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

export const DEMO_ACCOUNTS: Account[] = [
  ["demo-cash", "Efectivo", "cash", "BOB", "900.00", true, null],
  ["demo-bnb", "Tarjeta BNB", "card", "BOB", "3350.00", false, "4821"],
  ["demo-usd", "Tarjeta USD", "card", "USD", "300.00", false, "7730"],
].map(([id, name, type, currency, balance, isDefault, last4]) => ({
  id: id as string,
  name: name as string,
  type: type as string,
  currency: currency as string,
  current_balance: balance as string,
  is_default: isDefault as boolean,
  created_at: "2026-09-01T12:00:00Z",
  archived_at: null,
  institution_code: null,
  last4: last4 as string | null,
}));

const seed: [string, string, string, string, string][] = [
  ["expense", "c-food", "demo-cash", "186.00", "Hipermaxi"],
  ["income", "c-salary", "demo-bnb", "8000.00", "Sueldo"],
  ["expense", "c-subs", "demo-usd", "15.00", "Netflix"],
  ["expense", "c-transport", "demo-cash", "35.00", "Taxi"],
  ["expense", "c-food", "demo-bnb", "92.50", "Restaurante"],
  ["expense", "c-transport", "demo-cash", "12.00", "Micro"],
];

const transactions: Transaction[] = Array.from({ length: 30 }, (_, i) => {
  const [kind, category, account, amount, description] = seed[i % seed.length]!;
  const currency = account === "demo-usd" ? "USD" : "BOB";
  return {
    id: `demo-t${i + 1}`,
    kind,
    account_id: account,
    category_id: category,
    transfer_account_id: null,
    amount,
    currency,
    occurred_on: day(i * 2),
    description,
    source: "quick_add",
    created_at: `${day(i * 2)}T12:00:00Z`,
    has_receipt: false,
  };
});

const PAGE = 50;

/** Las fotos de los comprobantes del demo, en memoria. */
const receipts = new Map<string, Receipt>();

function matches(t: Transaction, q: TransactionsQuery): boolean {
  if (q.from && t.occurred_on < q.from) return false;
  if (q.to && t.occurred_on > q.to) return false;
  if (q.account_id && t.account_id !== q.account_id && t.transfer_account_id !== q.account_id) {
    return false;
  }
  if (q.category_id && t.category_id !== q.category_id) return false;
  if (q.currency && t.currency !== q.currency) return false;
  if (q.q && !t.description.toLowerCase().includes(q.q.toLowerCase())) return false;
  return true;
}

/** REQ-056: los aportes y retiros del demo, al Fondo de emergencia del Map. */
const goalMovements: GoalMovement[] = [
  ["gm3", "withdrawal", "demo-cash", "100.00", 3],
  ["gm2", "contribution", "demo-bnb", "300.00", 9],
  ["gm1", "contribution", "demo-cash", "200.00", 25],
].map(([id, kind, account, amount, offset]) => ({
  id: id as string,
  kind: kind as GoalMovement["kind"],
  goal_id: "g1",
  goal_name: "Fondo de emergencia",
  account_id: account as string,
  amount: amount as string,
  currency: "BOB",
  occurred_on: day(offset as number),
  created_at: `${day(offset as number)}T12:00:00Z`,
}));

export const demoTransactionsGateway: TransactionsGateway = {
  async list(_, query) {
    const all = transactions.filter((t) => matches(t, query));
    const start = query.cursor ? Number(query.cursor) : 0;
    const size = query.limit ?? PAGE;
    const items = all.slice(start, start + size);
    return { items, next_cursor: start + size < all.length ? String(start + size) : null };
  },
  async goalMovements(_, query) {
    const items = goalMovements.filter(
      (m) =>
        (!query.from || m.occurred_on >= query.from) &&
        (!query.to || m.occurred_on <= query.to) &&
        (!query.account_id || m.account_id === query.account_id) &&
        (!query.currency || m.currency === query.currency),
    );
    return { items, next_cursor: null };
  },
  accounts: async () => DEMO_ACCOUNTS,
  async update(_, id, changes) {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    if (changes.amount) tx.amount = String(changes.amount);
    if (changes.account_id) tx.account_id = changes.account_id;
    if (changes.category_id) tx.category_id = changes.category_id;
    if (changes.occurred_on) tx.occurred_on = changes.occurred_on;
    if (changes.description !== undefined) tx.description = changes.description ?? "";
  },
  async remove(_, id) {
    const i = transactions.findIndex((t) => t.id === id);
    if (i >= 0) transactions.splice(i, 1);
  },
  async receipt(_, id) {
    const found = receipts.get(id);
    if (!found) throw new ApiError("not_found", 404);
    return found;
  },
  async attachReceipt(_, id, photo) {
    const tx = transactions.find((t) => t.id === id && t.kind === "expense");
    if (!tx) throw new ApiError("not_found", 404);
    receipts.set(id, { bytes: await photo.arrayBuffer(), type: photo.type });
    tx.has_receipt = true;
  },
  async removeReceipt(_, id) {
    if (!receipts.delete(id)) throw new ApiError("not_found", 404);
    const tx = transactions.find((t) => t.id === id);
    if (tx) tx.has_receipt = false;
  },
};
